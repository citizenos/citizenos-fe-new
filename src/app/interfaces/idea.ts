
export enum IdeaStatus {
  draft = "draft",
  published = "published"
}
export interface Idea {
  id: string,
  ideationId: string,
  authorId: string,
  statement: string,
  description: string,
  imageUrl: string | null,
  createdAt: string,
  status: IdeaStatus,
  updatedAt: string,
  deletedAt?: string | null,
  deletedBy?: {
    id: string | null,
    name: string | null
  },
  deletedReasonText: string | null,
  deletedReasonType: string | null,
  showDeletedIdea: boolean | undefined,
  author: {
    id: string,
    name: string,
    company: string | null,
    email: string | null,
    imageUrl: string | null,
    phoneNumber: string | null,
  },
  edits: any[],
  replies: any,
  report: {
    id: string | null
  },
  votes: {
    up:{
      count: number,
      selected: boolean
    },
    down:{
      count: number,
      selected: boolean
    },
    count: number
  },
  favourite?: boolean | null,
  showEdits: boolean,
  showReplies: boolean
}

