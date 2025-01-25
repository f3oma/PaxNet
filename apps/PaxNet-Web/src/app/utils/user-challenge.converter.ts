import { Injectable, inject } from "@angular/core";
import { DocumentData, Firestore, FirestoreDataConverter, QueryDocumentSnapshot, Timestamp, doc, getDoc } from "@angular/fire/firestore";
import { BaseChallenge, BestAttemptChallenge, ChallengeType, IBestAttemptChallenge, IBestAttemptChallengeEntity, IChallengeBase, IChallengeEntityBase, IIterativeCompletionChallengeEntity, IterativeCompletionChallenge, IUserSelectedGoalChallenge, IUserSelectedGoalChallengeEntity, UserSelectedGoalChallenge } from "../models/user-challenge.model";
import { PaxManagerService } from "../services/pax-manager.service";
import { PaxModelConverter } from "./pax-model.converter";
import { PaxUser } from "../models/users.model";

@Injectable({
    providedIn: 'root'
})
export class UserChallengeConverter {
    
    firestore: Firestore = inject(Firestore);
    constructor(
        private paxManagerService: PaxManagerService,
        private paxModelConverter: PaxModelConverter) {}

    public getConverter(): FirestoreDataConverter<any> {
        const toDomain = this.toDomain;
        const toEntity = this.toEntity;
        const paxModelConverter = this.paxModelConverter;
        const paxManagementService = this.paxManagerService;
        return {
          toFirestore: <T extends IChallengeBase>(data: T): DocumentData => {
            return toEntity(data, paxManagementService);
          },
          fromFirestore(snap: QueryDocumentSnapshot) {
            return toDomain(snap.data() as IChallengeEntityBase, snap.id, paxModelConverter);
          }
        }
    }

    private toEntity<T extends IChallengeBase>(data: T, paxManagerService: PaxManagerService): DocumentData {
        const paxUserRef = paxManagerService.getUserReference('users/' + data.paxUser.id);
        const baseEntity: IChallengeEntityBase = {
            paxUserRef: paxUserRef,
            name: data.name,
            state: data.state,
            type: data.type,
            startDateString: data.startDateString,
            endDateString: data.endDateString,
            endDateTime: Timestamp.fromDate(data.endDateTime ?? new Date(data.endDateString)),
            challengeInfoId: data.challengeInfoId,
        };
        if (data instanceof IterativeCompletionChallenge) {
            return <IIterativeCompletionChallengeEntity> {
                ...baseEntity,
                activeCompletions: data.activeCompletions,
                totalToComplete: data.totalToComplete
            }
        } else if (data instanceof BestAttemptChallenge) {
            return <IBestAttemptChallengeEntity> {
                ...baseEntity,
                bestAttempt: data.bestAttempt
            }  
        } else if (data instanceof UserSelectedGoalChallenge) {
            return <IUserSelectedGoalChallengeEntity> {
                ...baseEntity,
                goal: data.goal,
                currentValue: data.currentValue
            }
        } else {
            console.error("Unknown challenge type when converting");
            return baseEntity;
        }
    }

    private async toDomain(data: IChallengeEntityBase, id: string, paxModelConverter: PaxModelConverter) {
        const paxUser = (await getDoc(data.paxUserRef!.withConverter(paxModelConverter.getConverter()))).data() as PaxUser
        switch(data.type) {
            case ChallengeType.IterativeCompletions:
                const iterativeEntity = data as IIterativeCompletionChallengeEntity;
                return new IterativeCompletionChallenge({
                    id,
                    paxUser,
                    name: data.name,
                    type: data.type,
                    state: data.state,
                    startDateString: data.startDateString,
                    endDateString: data.endDateString,
                    endDateTime: data.endDateTime?.toDate() ?? new Date(data.endDateString),
                    activeCompletions: iterativeEntity.activeCompletions,
                    totalToComplete: iterativeEntity.totalToComplete,
                    challengeInfoId: data.challengeInfoId,
                });
            case ChallengeType.UserSelectedGoal:
                const userSelectedGoalEntity = data as IUserSelectedGoalChallengeEntity;
                return new UserSelectedGoalChallenge({
                    id,
                    paxUser,
                    name: data.name,
                    type: data.type,
                    state: data.state,
                    startDateString: data.startDateString,
                    endDateString: data.endDateString,
                    endDateTime: data.endDateTime?.toDate() ?? new Date(data.endDateString),
                    goal: userSelectedGoalEntity.goal,
                    currentValue: userSelectedGoalEntity.currentValue,
                    challengeInfoId: data.challengeInfoId
                });
            default:
                return new BaseChallenge(id, paxUser, data.name, data.type, data.state, data.startDateString, data.endDateString, data.endDateTime?.toDate() ?? new Date(data.endDateString), data.challengeInfoId);
        }
    }
}