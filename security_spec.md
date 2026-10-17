# Security Specification — Amaura Farmer Assistant

## 1. Data Invariants
1. **Authentication & Ownership Isolation**: Every document under `/users/{userId}` and its subcollections (`crop_cycles`, `crop_cases`, `farm_transactions`, `reminders`, `conversations`) MUST require `request.auth != null`, `request.auth.uid == userId`, and `data.userId == request.auth.uid`.
2. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) MUST validate path IDs via `isValidId(id)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
3. **Strict Key Allowlisting**: Every `create` operation MUST validate `incoming().keys().hasAll(...)` and `incoming().keys().hasOnly(...)` to block Ghost/Shadow fields. Every `update` operation MUST validate `isValid[Entity](incoming())`, preserve immutable fields (`userId`, `createdAt`), and restrict changed keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
4. **Query Enforcer on List Operations**: Every `allow list` rule MUST check `isSignedIn() && request.auth.uid == userId && resource.data.userId == request.auth.uid`.
5. **Temporal Integrity**: Timestamp fields (`createdAt`, `updatedAt`) MUST be validated with `is timestamp && <= request.time` on creation, and `createdAt` MUST be immutable (`incoming().createdAt == existing().createdAt`) on updates.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Read**: `unauthDb.collection("users/alice/crop_cycles").get()` -> Reject (`request.auth != null`).
2. **Cross-User Profile Read (PII Leak)**: Bob reads `/users/alice` -> Reject (`request.auth.uid == userId`).
3. **Identity Spoofing on Create**: Alice writes to `/users/alice/crop_cycles/c1` with `userId: "bob"` -> Reject (`incoming().userId == request.auth.uid`).
4. **Shadow/Ghost Field Injection on Create**: Alice includes `isAdmin: true` in `/users/alice` -> Reject (`keys().hasOnly(...)`).
5. **Shadow/Ghost Field Injection on Update**: Alice updates `/users/alice/crop_cases/case1` adding `verifiedByGov: true` -> Reject (`affectedKeys().hasOnly(...)`).
6. **Immutable `createdAt` Tampering on Update**: Alice modifies `createdAt` during an update on `/users/alice/farm_transactions/tx1` -> Reject (`incoming().createdAt == existing().createdAt`).
7. **Immutable `userId` Transfer on Update**: Alice changes `userId` to `"bob"` during update -> Reject (`incoming().userId == existing().userId`).
8. **Value Poisoning (Oversized String)**: Alice sends a 10,000-char `cropName` -> Reject (`cropName.size() <= 80`).
9. **Enum Bypass**: Alice creates a `FarmTransaction` with `txType: "LOAN_SHARK"` -> Reject (`txType in ['EXPENSE', 'SALE']`).
10. **Negative Amount Injection**: Alice creates a `FarmTransaction` with `amountInr: -500` -> Reject (`amountInr > 0`).
11. **Unfiltered List Query**: Alice queries `/users/alice/reminders` without `.where("userId", "==", "alice")` when a document doesn't match or cross-user list -> Reject (`resource.data.userId == request.auth.uid`).
12. **Future Timestamp Injection**: Alice writes `createdAt` set 1 hour in the future -> Reject (`incoming().createdAt <= request.time`).
