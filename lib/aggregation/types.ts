export interface PersonnelAggregation {
  personnelId: string
  total: string // decimal string representation
}

export interface ProjectAggregation {
  projectId: string
  total: string
}

export interface HqAggregation {
  hqId: string
  total: string
}

export interface EnterpriseAggregation {
  total: string
}
