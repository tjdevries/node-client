
export interface Version {
    api_compatible: number;
    api_level: number;
    api_prerelease: boolean;
    major: number;
    minor: number;
    patch: number;
}

export interface Parameter {
    type: string;
    name: string;
}

export interface Method {
    method: boolean;
    name: string;
    returnType: string;
    parameters: Parameter[];
    since: number;
    deprecatedSince?: boolean;
}

export interface Type {
    id: number;
    prefix: string;
}

// TODO: Determine what this pendingRPC message would look like.
export interface Message {
    type: 'request' | 'notification';
    args: any[];
}