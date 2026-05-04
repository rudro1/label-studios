import { ProjectsPage } from "./Projects/Projects";
import { HomePage } from "./Home/HomePage";
import { OrganizationPage } from "./Organization";
import { ModelsPage } from "./Organization/Models/ModelsPage";
import { FF_HOMEPAGE, isFF } from "../utils/feature-flags";
import { pages } from "@humansignal/app-common";

const canViewOrganization =
  window.APP_SETTINGS?.user?.is_superuser || window.APP_SETTINGS?.user?.active_organization_role === "admin";

export const Pages = [
  isFF(FF_HOMEPAGE) && HomePage,
  ProjectsPage,
  canViewOrganization && OrganizationPage,
  ModelsPage,
  pages.AccountSettingsPage,
].filter(Boolean);
