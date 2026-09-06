import type { AwikiMailRecoveryObservability } from './types.ts';
export type AwikiMailRecoveryFailureFields = Pick<AwikiMailRecoveryObservability, 'mail_ingress_classification' | 'auth_status_class' | 'auth_stable_machine_code' | 'retryable' | 'mail_closed_classification'>;
/** Copy only a complete upstream closed classification; arbitrary errors fail closed. */
export declare function mailRecoveryFailureFields(error: unknown): AwikiMailRecoveryFailureFields | undefined;
export declare function successfulMailRecoveryObservability(): AwikiMailRecoveryObservability;
export declare function failedMailRecoveryObservability(error: unknown): AwikiMailRecoveryObservability;
export declare function fencedMailRecoveryObservability(currentPrincipalMatchesRecovery: boolean, requestGenerationClassification: 'current' | 'replaced'): AwikiMailRecoveryObservability;
//# sourceMappingURL=mail-recovery-observability.d.ts.map