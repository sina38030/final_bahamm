export type GroupKind = "primary" | "secondary";
export type GroupStatus = "ongoing" | "success" | "failed";

export interface GroupParticipant {
  userId: string | number | null;
  isLeader: boolean;
}

export interface Group {
  id: string;
  kind: GroupKind;
  status: GroupStatus;
  leaderUserId: string | number;
  minJoinersForSuccess: number;
  participants: Array<GroupParticipant>;
  expiresAt: string; // ISO
  sourceGroupId?: string | number;
  sourceOrderId?: string | number;
  joinCode: string;
  shareUrl: string;
}


