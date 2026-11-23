/** The list's filters ('' = any): GET /users?q=&role=&status=; the list adds page, pageSize. */
export interface UsersView {
  q: string;
  role: string;
  status: string;
}
