export interface Params {
  page: number;
  offset: number;
  limit: number;
  order?: string | null;
  orderBy?: string | null;
  sourcePartnerId?: string | null;
  search?: string | null;
  userId?: string;
}
