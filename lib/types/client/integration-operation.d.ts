/** Browser-side recovery for one Integration management mutation. */
export type IntegrationOperationKind = 'create' | 'update' | 'rotate' | 'close' | 'reopen';
/** Generate a canonical UUIDv7 for one browser-initiated management mutation. */
export declare function integrationOperationId(): string;
export declare function durableIntegrationOperationId(kind: IntegrationOperationKind, signature: string): string;
export declare function clearIntegrationOperation(kind: IntegrationOperationKind): void;
/** A definitive management read proves any earlier uncertain mutation can be retired. */
export declare function clearIntegrationOperations(): void;
//# sourceMappingURL=integration-operation.d.ts.map