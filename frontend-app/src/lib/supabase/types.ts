export type ConsentDoc = 'terms' | 'privacy' | 'age_14' | 'marketing';

export type ProfileRow = {
	id: string;
	nickname: string | null;
	school: string | null;
	character: 0 | 1 | 2 | 3 | null;
	created_at: string;
	updated_at: string;
};

export type ConsentRow = {
	id: number;
	user_id: string;
	doc: ConsentDoc;
	version: string;
	agreed: boolean;
	agreed_at: string;
};
