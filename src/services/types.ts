import { ErrorType } from "../lib/proto/error/v1/error_pb";
import { ContractStatus, DepositType, KycStatus, PaymentAuthorizationStatus } from "../lib/proto/api/v1/common_pb";
import { ChargeMessage_ApiSource, ChargeMessage_Status, EventType } from "../lib/proto/api/v1/merchant_webhooks_pb";
import { OnSessionPaymentErrorCode } from "../lib/proto/api/v1/payment_pb";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function equals<T extends Record<string, any>>(enumObj: T, expectedValue: T[keyof T], actualValue: string): boolean {
    const keys = Object.keys(enumObj).filter(v => Number.isNaN(Number(v)));
    const expectedKey = keys.find(k => enumObj[k] === expectedValue);
    return expectedKey ? actualValue.endsWith(expectedKey) : false;
}

export default {
    ErrorType,
    errorTypeEquals: (expectedValue: ErrorType, given: string) => equals(ErrorType, expectedValue, given),

    DepositType,
    depositTypeEquals: (expectedValue: DepositType, given: string) => equals(DepositType, expectedValue, given),

    KycStatus,
    kycStatusEquals: (expectedValue: KycStatus, given: string) => equals(KycStatus, expectedValue, given),

    PaymentAuthorizationStatus,
    paymentAuthorizationStatusEquals: (expectedValue: PaymentAuthorizationStatus, given: string) => equals(PaymentAuthorizationStatus, expectedValue, given),

    ContractStatus,
    contractStatusEquals: (expectedValue: ContractStatus, given: string) => equals(ContractStatus, expectedValue, given),

    ChargeMessage_Status,
    chargeMessageStatusEquals: (expectedValue: ChargeMessage_Status, given: string) => equals(ChargeMessage_Status, expectedValue, given),

    // ChargeMessage.api_source — identifies which API created the charge
    // (off-session sync/async or on-session). Present on charge and refund webhooks.
    ChargeMessage_ApiSource,
    apiSourceEquals: (expectedValue: ChargeMessage_ApiSource, given: string) => equals(ChargeMessage_ApiSource, expectedValue, given),

    EventType,
    eventTypeEquals: (expectedValue: EventType, given: string) => equals(EventType, expectedValue, given),

    OnSessionPaymentErrorCode,
    onSessionPaymentErrorCodeEquals: (expectedValue: OnSessionPaymentErrorCode, given: string) => equals(OnSessionPaymentErrorCode, expectedValue, given),
}
