export type Root = Root2[];

export interface Root2 {
    id: string;
    name: string;
    email: string;
    expenses: Expense[];
    budget: Budget,
    password: string;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string;
    currency: string;
    paymentMethod: string;
    isIncoming: boolean;
    category: string;
    tags: string[];
    isPaid: boolean;
}



export interface PaymentMethod {
    method: string;
    cardDetails: CardDetails;
}

export interface CardDetails {
    number: string;
    expiry: string;
}


export interface Budget {
    monthlyLimit: number;
    notificationThreshold: number;
    isActive: boolean;
}
