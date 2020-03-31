export enum Features {
    AllDefault = 'AllDefault',
    MockAbci = 'MockAbci',
    MockObfuscation = 'MockObfuscation',
}

export const getRustFeaturesFromEnv = (nodeEnv?: string): Features => {
    switch (nodeEnv) {
        case 'test':
            return Features.MockObfuscation;
        case 'integration-test':
            return Features.AllDefault;
        default:
            return Features.AllDefault;
    }
};
