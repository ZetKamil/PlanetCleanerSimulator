export type AchievementCategory = 'exploration' | 'cleaning' | 'automation' | 'survival' | 'endgame';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
    id: string;
    category: AchievementCategory;
    tier: AchievementTier;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    currentProgress: number;
    maxProgress: number;
    isUnlocked: boolean;
    unlockedAt?: string;
    rewardCredits: number;
    rewardClaimed: boolean;
}
