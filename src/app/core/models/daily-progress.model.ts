export interface AssignmentTypeBreakdownItem {
  label: string;
  count: number;
}

export interface DailyProgressSummary {
  completedAssignments: number;
  totalAssignments: number;
  completedTravelMinutes: number;
  totalTravelMinutes: number;
  typeBreakdown: AssignmentTypeBreakdownItem[];
}

export const EMPTY_DAILY_PROGRESS_SUMMARY: DailyProgressSummary = {
  completedAssignments: 0,
  totalAssignments: 0,
  completedTravelMinutes: 0,
  totalTravelMinutes: 0,
  typeBreakdown: [],
};
