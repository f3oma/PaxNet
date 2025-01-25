export interface IUserProfileDataEntity {
    links: Record<string, ExternalLink>;
    badges: Badge[];
    countOfEHUsers: number;
    ehUserJsonString: string;
    achievements: Achievement[]
}

export interface UserProfileData {
    links: Record<string, ExternalLink>;
    badges: Badge[];
    countOfEHUsers: number;
    ehUsers: { id: string, f3Name: string }[];
    achievements: Achievement[];
}

interface ExternalLink {
    url: string;
}

export interface Badge {
    backgroundColor: string;
    text: string;
    textColor: string;
    backgroundImage?: string;
}

export interface Achievement {
    name: string;
    text: string;
    dateCompleted: string;
    imageSrc?: string;
    challengeInfoId: string;
}
