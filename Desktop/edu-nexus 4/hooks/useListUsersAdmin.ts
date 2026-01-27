import { authClient } from '@/auth/auth-client';
import { QUERY_KEYS } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';

type filterType = Parameters<typeof authClient.admin.listUsers>[0]['query'];
export default function useListUsersAdmin(filterData: filterType) {
  return useQuery({
    queryFn: () => authClient.admin.listUsers({ query: filterData }),
    queryKey: [QUERY_KEYS.listUsersAdmin, filterData],
  });
}
