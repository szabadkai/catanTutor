export const RESOURCES = ['wood', 'brick', 'wool', 'grain', 'ore'] as const;
export type Resource = (typeof RESOURCES)[number];
export type ResourceBag = Record<Resource, number>;
export type PlayerId = string;
export type TutorMode = 'guided' | 'socratic' | 'hint' | 'silent';
export const RESOURCE_LABELS: Record<Resource, string> = {
  wood: 'Timber',
  brick: 'Clay',
  wool: 'Wool',
  grain: 'Grain',
  ore: 'Ore',
};
export const RESOURCE_ICONS: Record<Resource, string> = {
  wood: '♠',
  brick: '▰',
  wool: '✿',
  grain: '♜',
  ore: '◆',
};
export function bag(amount = 0): ResourceBag {
  return { wood: amount, brick: amount, wool: amount, grain: amount, ore: amount };
}
export function sumBag(resources: ResourceBag): number {
  return RESOURCES.reduce((n, r) => n + resources[r], 0);
}
export const SKILLS = [
  'opening-placement',
  'production',
  'resource-diversity',
  'scarcity',
  'expansion',
  'road-planning',
  'ports',
  'tempo',
  'trading',
  'blocking',
  'threat-assessment',
  'hand-management',
  'development-strategy',
  'endgame',
] as const;
export type TutorConcept = (typeof SKILLS)[number];
