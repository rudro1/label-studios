import { getParent, hasParent, types } from "mobx-state-tree";
import { FF_LSDV_4583, isFF } from "../utils/feature-flags";

function showRequiredToast(self) {
  try {
    const message =
      self.requiredmessage ||
      `"${self.name || self.type || "field"}" is required.`;
    const toast = (typeof window !== "undefined" && window.LS_TOAST) || null;
    if (toast?.show) {
      toast.show({ message, type: "error" });
    }
  } catch (_) {}
}

/**
 * Looks for a given visibility parameter in the node or its parents.
 * For convenience users can specify visibility parameters in parent `View` tag up the tree.
 * @todo We should use it for all params but for now it's only used for `whenrole`.
 * @param {Object} node Control tag
 * @param {string} param Visibility parameter name (whenrole, whenlabelvalue, whenchoicevalue)
 * @returns {string|null}
 */
function findVisibilityParam(node, param) {
  while (node) {
    if (node[param]) {
      return node[param];
    }
    // all tags are sitting in `children` array of their parent,
    // so we need to go up 2 levels to get the parent
    if (!hasParent(node, 2)) break;
    node = getParent(node, 2);
  }
  return null;
}

function getChoiceResultsForRegion(region) {
  return region.results.filter((result) => ["choices", "taxonomy"].includes(result.type));
}

function getChoiceVisibilityConfig(control) {
  const visibleWhen = findVisibilityParam(control, "visiblewhen");

  if (visibleWhen !== "choice-selected" && visibleWhen !== "choice-unselected") {
    return null;
  }

  const whenChoiceValue = findVisibilityParam(control, "whenchoicevalue");

  return {
    visibleWhen,
    tagName: findVisibilityParam(control, "whentagname"),
    choiceValues: whenChoiceValue?.split(",").filter(Boolean) ?? null,
  };
}

function regionMatchesChoiceVisibility(region, control) {
  const visibilityConfig = getChoiceVisibilityConfig(control);

  if (!visibilityConfig) {
    return true;
  }

  const { choiceValues, tagName, visibleWhen } = visibilityConfig;
  const choiceResults = getChoiceResultsForRegion(region);

  const matchesResult = (result) => {
    const selectedValues = Array.isArray(result.mainValue) ? result.mainValue : [result.mainValue];
    const normalizedValues = selectedValues.map((value) => (Array.isArray(value) ? value.at(-1) : value));

    if (!choiceValues || !choiceValues.length) {
      return normalizedValues.length > 0;
    }

    return choiceValues.some((expectedValue) =>
      normalizedValues.some((actualValue) => result.from_name.selectedChoicesMatch(expectedValue, actualValue)),
    );
  };

  const isChoiceSelected = tagName
    ? choiceResults.some((result) => result.from_name.name === tagName && matchesResult(result))
    : choiceResults.some(matchesResult);

  return visibleWhen === "choice-selected" ? isChoiceSelected : !isChoiceSelected;
}

const RequiredMixin = types
  .model({
    required: types.optional(types.boolean, false),
    requiredmessage: types.maybeNull(types.string),
  })
  .actions((self) => {
    const Super = {
      validate: self.validate,
    };

    return {
      validate() {
        if (!Super.validate()) return false;
        if (!self.required) return true;

        if (self.perregion) {
          // validating when choices labeling is done per region,
          // for example choice may be required to be selected for
          // every bbox
          const objectTag = self.toNameTag;

          // if regions don't meet visibility conditions skip validation
          for (const reg of objectTag.allRegs) {
            const s = reg.results.find((s) => s.from_name === self);

            if (self.visiblewhen === "region-selected") {
              if (self.whentagname) {
                const label = reg.labeling?.from_name?.name;

                if (label && label !== self.whentagname) continue;
              }
            }

            if (reg.role) {
              const whenRoles = findVisibilityParam(self, "whenrole")?.split(",") ?? null;
              if (whenRoles && !whenRoles.includes(reg.role)) continue;
            }

            if (self.whenlabelvalue && !reg.hasLabel(self.whenlabelvalue)) {
              continue;
            }

            if (!regionMatchesChoiceVisibility(reg, self)) {
              continue;
            }

            if (s?.canBeSubmitted === false) {
              continue;
            }

            if (!s?.hasValue) {
              self.annotation.selectArea(reg);
              showRequiredToast(self);
              self.requiredModal();

              return false;
            }
          }
        } else if (isFF(FF_LSDV_4583) && self.peritem) {
          // validating when choices labeling is done per item,
          const objectTag = self.toNameTag;
          const maxItemIndex = objectTag.maxItemIndex;
          const existingResultsIndexes = self.annotation.regions.reduce((existingResultsIndexes, reg) => {
            const result = reg.results.find((s) => s.from_name === self);

            if (result?.hasValue) {
              existingResultsIndexes.add(reg.item_index);
            }
            return existingResultsIndexes;
          }, new Set());

          for (let idx = 0; idx <= maxItemIndex; idx++) {
            if (!existingResultsIndexes.has(idx)) {
              objectTag.setCurrentItem(idx);
              showRequiredToast(self);
              self.requiredModal();
              return false;
            }
          }
        } else {
          // validation when its classifying the whole object
          // isVisible can be undefined (so comparison is true) or boolean (so check for visibility)
          if (!self.holdsState && self.isVisible !== false && getParent(self, 2)?.isVisible !== false) {
            showRequiredToast(self);
            self.requiredModal();
            return false;
          }
        }
        return true;
      },
    };
  });

export default RequiredMixin;
