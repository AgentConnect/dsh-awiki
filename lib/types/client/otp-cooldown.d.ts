/** Retain the server cooldown across panel remounts, without persisting OTPs. */
export declare function useRecoveryOtpCooldown(): {
    seconds: number;
    start: (seconds: number) => void;
    restore: (retryAt: string | null | undefined) => void;
};
//# sourceMappingURL=otp-cooldown.d.ts.map