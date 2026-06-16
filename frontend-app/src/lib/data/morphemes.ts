// 어근(어원 조각) = 이 앱의 1급 데이터.
// 의학용어(terms.ts)는 morpheme id 배열(`parts`)로 정의된다 — "용어 = 어근의 조합".
// 학습은 ① 어근 친숙화(강의실) → ② 조합 작업(도서관·병동)의 한 경사로.
// 도감/진척/랭킹의 단위도 morpheme. 자세한 원칙은 루트 CLAUDE.md "학습 척추" 참고.

export type MorphemeType = 'prefix' | 'root' | 'suffix';

/**
 * 출처 키 — `SOURCES`의 키. 신뢰성 추적용. 생략 = 직접 손으로 큐레이션한 원본 세트(검수됨).
 * 외부 자료에서 가져온 항목은 반드시 이 키 + (검수 전이면) `verified: false`를 같이 둘 것.
 */
export type MorphemeSource = 'nbk-ch1' | 'wikipedia' | 'curated';

export interface Morpheme {
	/** 안정 키. 소문자, 하이픈 없음, 어근 형태 (combining form 아님). 예: 'cardi' | 'itis' | 'hyper' */
	id: string;
	/** 표시용 combining form. 예: 'cardi/o' | '-itis' | 'hyper-' | 'hem/o, hemat/o' */
	form: string;
	type: MorphemeType;
	/** 이형태(대표형 id 외의 표면형). 예: a → ['a','an'], hemo → ['hem','hemat'] */
	variants?: string[];
	/** root끼리 이을 때 쓰는 연결모음. 대부분 'o' (Gk), 'i' (L). */
	combiningVowel?: string;
	meaning: string;
	/** 한국어 뜻. 우리말로 직접 작성(영어 뜻 기계번역 금지). 비어 있으면 학습 큐에 안 나옴. */
	meaningKo: string;
	origin: string;
	/** 커리큘럼 위치. 1 = 최빈출/기초. body system과 무관, 빈도·난이도순. */
	unit: number;
	/** 조합 규칙 등 사용 노트. */
	note?: string;
	/** 출처 (외부 자료에서 발췌·번안한 경우 표시). 생략 = 원본 큐레이션. */
	source?: MorphemeSource;
	/** 사람이 검수 완료했나. 생략/true = 검수됨(학습에 사용). false = 후보(도감 검색에만 노출, 학습 큐 제외). */
	verified?: boolean;
}

/** 데이터 출처 — 크레딧 표기 + 라이선스 추적용. */
export const SOURCES: Record<MorphemeSource, { name: string; url: string; license: string }> = {
	'nbk-ch1': {
		name: 'Medical Terminology, 2nd ed. — Ch.1 (Open RN / Chippewa Valley Technical College)',
		url: 'https://www.ncbi.nlm.nih.gov/books/NBK607453/',
		license: 'CC BY 4.0'
	},
	wikipedia: {
		name: 'Wikipedia — List of medical roots and affixes',
		url: 'https://en.wikipedia.org/wiki/List_of_medical_roots_and_affixes',
		license: 'CC BY-SA 4.0'
	},
	curated: { name: '직접 큐레이션', url: '', license: '' }
};

/** 커리큘럼 단원 정의 (어원 빈도·난이도순). */
export const UNITS: { n: number; title: string; desc: string }[] = [
	{ n: 1, title: '필수 어근·접사', desc: '가장 자주 나오는 접미사·접두사 + 핵심 장기 어근' },
	{ n: 2, title: '확장 어근·접사', desc: '빈출 장기·조직 어근 + 자주 쓰는 접사' },
	{ n: 3, title: '심화 어근·접사', desc: '특정 영역 어근 + 드문 접사' }
];

export const morphemes: Morpheme[] = [
	// ───────────────── Prefixes 접두사 ─────────────────
	{ id: 'a', form: 'a-, an-', type: 'prefix', variants: ['a', 'an'], meaning: 'without, not', meaningKo: '~없는, 결여', origin: 'Gk. a-/an-', unit: 1, note: '모음 앞에서는 an-' },
	{ id: 'hyper', form: 'hyper-', type: 'prefix', meaning: 'excessive, above normal', meaningKo: '과도한, 정상 이상', origin: 'Gk. hyper', unit: 1 },
	{ id: 'dys', form: 'dys-', type: 'prefix', meaning: 'bad, difficult, abnormal', meaningKo: '나쁜, 어려운, 비정상', origin: 'Gk. dys', unit: 1 },
	{ id: 'poly', form: 'poly-', type: 'prefix', meaning: 'many, much', meaningKo: '많은, 다수', origin: 'Gk. polys', unit: 1 },
	{ id: 'peri', form: 'peri-', type: 'prefix', meaning: 'around, surrounding', meaningKo: '주위, 둘러싼', origin: 'Gk. peri', unit: 1 },
	{ id: 'endo', form: 'endo-', type: 'prefix', meaning: 'within, inner', meaningKo: '내부, 안쪽', origin: 'Gk. endon', unit: 1 },
	{ id: 'intra', form: 'intra-', type: 'prefix', meaning: 'within, inside', meaningKo: '~내, 안에', origin: 'L. intra', unit: 1 },
	{ id: 'sub', form: 'sub-', type: 'prefix', meaning: 'under, below', meaningKo: '아래, 밑', origin: 'L. sub', unit: 1 },
	{ id: 'bi', form: 'bi-', type: 'prefix', meaning: 'two, double, both', meaningKo: '둘, 양쪽', origin: 'L. bi-', unit: 2 },
	{ id: 'hemi', form: 'hemi-', type: 'prefix', meaning: 'half, one side', meaningKo: '반쪽, 한쪽', origin: 'Gk. hemi-', unit: 2 },
	{ id: 'tachy', form: 'tachy-', type: 'prefix', meaning: 'fast, rapid', meaningKo: '빠른', origin: 'Gk. tachys', unit: 2 },
	{ id: 'brady', form: 'brady-', type: 'prefix', meaning: 'slow', meaningKo: '느린', origin: 'Gk. bradys', unit: 2 },
	{ id: 'meta', form: 'meta-', type: 'prefix', meaning: 'change, beyond, after', meaningKo: '변화, 이후', origin: 'Gk. meta', unit: 3 },
	// ── 보정사 전계통 보강 접두사 ──
	{ id: 'hypo', form: 'hypo-', type: 'prefix', meaning: 'below normal, deficient, under', meaningKo: '저하, 정상 이하', origin: 'Gk. hypo', unit: 1, note: 'hyper-(과다)의 반대' },
	{ id: 'pre', form: 'pre-', type: 'prefix', meaning: 'before, in front of', meaningKo: '이전, 앞', origin: 'L. prae', unit: 2 },
	{ id: 'post', form: 'post-', type: 'prefix', meaning: 'after, behind', meaningKo: '이후, 뒤', origin: 'L. post', unit: 2 },
	{ id: 'neo', form: 'neo-', type: 'prefix', meaning: 'new, recent', meaningKo: '새로운, 신생', origin: 'Gk. neos', unit: 2 },
	{ id: 'epi', form: 'epi-', type: 'prefix', meaning: 'upon, over, above', meaningKo: '위, 표면', origin: 'Gk. epi', unit: 2 },

	// ───────────────── Roots 어근 ─────────────────
	{ id: 'cardi', form: 'cardi/o', type: 'root', combiningVowel: 'o', meaning: 'heart', meaningKo: '심장', origin: 'Gk. kardia', unit: 1 },
	{ id: 'angi', form: 'angi/o', type: 'root', combiningVowel: 'o', meaning: 'vessel', meaningKo: '혈관', origin: 'Gk. angeion', unit: 2 },
	{ id: 'arteri', form: 'arteri/o', type: 'root', combiningVowel: 'o', meaning: 'artery', meaningKo: '동맥', origin: 'Gk. artēria', unit: 2 },
	{ id: 'phleb', form: 'phleb/o', type: 'root', combiningVowel: 'o', meaning: 'vein', meaningKo: '정맥', origin: 'Gk. phleps', unit: 2, note: 'ven/o(L.)와 같은 뜻 — 정맥 절개·채혈(phlebotomy) 계열에서 주로 phleb/o 사용' },
	{ id: 'neur', form: 'neur/o', type: 'root', combiningVowel: 'o', meaning: 'nerve', meaningKo: '신경', origin: 'Gk. neuron', unit: 1 },
	{ id: 'nephr', form: 'nephr/o', type: 'root', combiningVowel: 'o', meaning: 'kidney', meaningKo: '신장, 콩팥', origin: 'Gk. nephros', unit: 1 },
	{ id: 'hemo', form: 'hem/o, hemat/o', type: 'root', variants: ['hem', 'hemat'], combiningVowel: 'o', meaning: 'blood', meaningKo: '혈액, 피', origin: 'Gk. haima', unit: 1 },
	{ id: 'my', form: 'my/o', type: 'root', combiningVowel: 'o', meaning: 'muscle', meaningKo: '근육', origin: 'Gk. mys', unit: 1 },
	{ id: 'gastr', form: 'gastr/o', type: 'root', combiningVowel: 'o', meaning: 'stomach', meaningKo: '위(장)', origin: 'Gk. gaster', unit: 1 },
	{ id: 'enter', form: 'enter/o', type: 'root', combiningVowel: 'o', meaning: 'intestine, small intestine', meaningKo: '장, 소장', origin: 'Gk. enteron', unit: 2 },
	{ id: 'hepat', form: 'hepat/o', type: 'root', combiningVowel: 'o', meaning: 'liver', meaningKo: '간', origin: 'Gk. hepar', unit: 1 },
	{ id: 'cephal', form: 'cephal/o', type: 'root', combiningVowel: 'o', meaning: 'head', meaningKo: '머리', origin: 'Gk. kephale', unit: 2 },
	{ id: 'encephal', form: 'encephal/o', type: 'root', combiningVowel: 'o', meaning: 'brain', meaningKo: '뇌', origin: 'Gk. enkephalos', unit: 2 },
	{ id: 'mening', form: 'mening/o', type: 'root', combiningVowel: 'o', meaning: 'meninges, membrane', meaningKo: '수막, 뇌척수막', origin: 'Gk. meninx', unit: 2 },
	{ id: 'pneumo', form: 'pneum/o, pneumon/o', type: 'root', variants: ['pneum', 'pneumon'], combiningVowel: 'o', meaning: 'lung, air', meaningKo: '폐, 공기', origin: 'Gk. pneumon / pneuma', unit: 2 },
	{ id: 'bronch', form: 'bronch/o', type: 'root', combiningVowel: 'o', meaning: 'bronchus, airway', meaningKo: '기관지', origin: 'Gk. bronchos', unit: 2 },
	{ id: 'thorax', form: 'thorac/o, -thorax', type: 'root', variants: ['thorac'], combiningVowel: 'o', meaning: 'chest', meaningKo: '흉곽, 가슴', origin: 'Gk. thorax', unit: 3 },
	{ id: 'pleur', form: 'pleur/o', type: 'root', combiningVowel: 'o', meaning: 'pleura, rib', meaningKo: '흉막, 늑막', origin: 'Gk. pleura', unit: 3 },
	{ id: 'cyt', form: 'cyt/o', type: 'root', combiningVowel: 'o', meaning: 'cell', meaningKo: '세포', origin: 'Gk. kytos', unit: 2 },
	{ id: 'thromb', form: 'thromb/o', type: 'root', combiningVowel: 'o', meaning: 'clot, thrombus', meaningKo: '혈전, 응괴', origin: 'Gk. thrombos', unit: 2 },
	{ id: 'leuk', form: 'leuk/o', type: 'root', combiningVowel: 'o', meaning: 'white', meaningKo: '흰색, 백색', origin: 'Gk. leukos', unit: 2 },
	{ id: 'necr', form: 'necr/o', type: 'root', combiningVowel: 'o', meaning: 'death (of tissue)', meaningKo: '괴사, 죽음', origin: 'Gk. nekros', unit: 2 },
	{ id: 'hydr', form: 'hydr/o', type: 'root', combiningVowel: 'o', meaning: 'water, fluid', meaningKo: '물, 체액', origin: 'Gk. hydor', unit: 2 },
	{ id: 'rhythm', form: 'rhythm/o', type: 'root', combiningVowel: 'o', meaning: 'rhythm', meaningKo: '리듬, 율동', origin: 'Gk. rhythmos', unit: 2 },
	{ id: 'muscul', form: 'muscul/o', type: 'root', combiningVowel: 'o', meaning: 'muscle', meaningKo: '근육', origin: 'L. musculus', unit: 2 },
	{ id: 'ven', form: 'ven/o', type: 'root', combiningVowel: 'o', meaning: 'vein', meaningKo: '정맥', origin: 'L. vena', unit: 2 },
	{ id: 'electr', form: 'electr/o', type: 'root', combiningVowel: 'o', meaning: 'electricity, electrical activity', meaningKo: '전기, 전기 활동', origin: 'Gk. ēlektron', unit: 2 },
	{ id: 'cutane', form: 'cutane/o', type: 'root', combiningVowel: 'o', meaning: 'skin', meaningKo: '피부', origin: 'L. cutis', unit: 2 },
	{ id: 'later', form: 'later/o', type: 'root', combiningVowel: 'o', meaning: 'side', meaningKo: '측면, 옆', origin: 'L. latus', unit: 2 },
	{ id: 'oste', form: 'oste/o', type: 'root', combiningVowel: 'o', meaning: 'bone', meaningKo: '뼈', origin: 'Gk. osteon', unit: 2 },
	{ id: 'scler', form: 'scler/o', type: 'root', combiningVowel: 'o', meaning: 'hard, hardening', meaningKo: '경화, 단단함', origin: 'Gk. skleros', unit: 3 },
	{ id: 'ather', form: 'ather/o', type: 'root', combiningVowel: 'o', meaning: 'fatty plaque, gruel', meaningKo: '죽종, 지방반', origin: 'Gk. athere', unit: 3 },
	{ id: 'atel', form: 'atel/o', type: 'root', combiningVowel: 'o', meaning: 'incomplete, imperfect', meaningKo: '불완전한', origin: 'Gk. ateles', unit: 3 },
	{ id: 'fibr', form: 'fibr/o', type: 'root', combiningVowel: 'o', meaning: 'fiber, fibrous tissue', meaningKo: '섬유', origin: 'L. fibra', unit: 3 },
	{ id: 'chole', form: 'chol/e, chol/o', type: 'root', variants: ['chol'], combiningVowel: 'e', meaning: 'bile, gall', meaningKo: '담즙, 쓸개즙', origin: 'Gk. chole', unit: 3 },
	{ id: 'cyst', form: 'cyst/o', type: 'root', combiningVowel: 'o', meaning: 'bladder, sac, fluid-filled pouch', meaningKo: '방광, 주머니', origin: 'Gk. kystis', unit: 3 },
	{ id: 'appendic', form: 'appendic/o', type: 'root', combiningVowel: 'o', meaning: 'appendix', meaningKo: '충수', origin: 'L. appendix', unit: 3 },
	{ id: 'pancreat', form: 'pancreat/o', type: 'root', combiningVowel: 'o', meaning: 'pancreas', meaningKo: '췌장', origin: 'Gk. pankreas', unit: 3 },
	{ id: 'lith', form: 'lith/o, -lith', type: 'root', combiningVowel: 'o', meaning: 'stone, calculus', meaningKo: '돌, 결석', origin: 'Gk. lithos', unit: 3 },
	{ id: 'glomerul', form: 'glomerul/o', type: 'root', combiningVowel: 'o', meaning: 'glomerulus', meaningKo: '사구체', origin: 'L. glomerulus', unit: 3 },
	{ id: 'protein', form: 'protein/o', type: 'root', combiningVowel: 'o', meaning: 'protein', meaningKo: '단백질', origin: 'Gk. proteios', unit: 3 },
	{ id: 'olig', form: 'olig/o', type: 'root', combiningVowel: 'o', meaning: 'scanty, few, deficient', meaningKo: '적은, 부족한', origin: 'Gk. oligos', unit: 3 },
	{ id: 'isch', form: 'isch/o', type: 'root', combiningVowel: 'o', meaning: 'to hold back, restrict', meaningKo: '억제, 막힘', origin: 'Gk. ischein', unit: 3 },
	{ id: 'infarction', form: 'infarction', type: 'root', meaning: 'infarction; tissue death from blocked blood supply', meaningKo: '경색', origin: 'L. infarcire', unit: 3 },
	{ id: 'edema', form: 'edema, -edema', type: 'root', meaning: 'swelling, fluid accumulation', meaningKo: '부종, 부기', origin: 'Gk. oidema', unit: 3 },
	// ── 보정사 전계통 보강 어근 (내분비·생식·감각·외피) ──
	{ id: 'glyc', form: 'glyc/o', type: 'root', combiningVowel: 'o', meaning: 'sugar, glucose', meaningKo: '당, 포도당', origin: 'Gk. glykys', unit: 2 },
	{ id: 'thyroid', form: 'thyroid/o', type: 'root', combiningVowel: 'o', meaning: 'thyroid gland', meaningKo: '갑상선', origin: 'Gk. thyreoeides', unit: 3 },
	{ id: 'aden', form: 'aden/o', type: 'root', combiningVowel: 'o', meaning: 'gland', meaningKo: '샘, 선(腺)', origin: 'Gk. aden', unit: 2 },
	{ id: 'gynec', form: 'gynec/o', type: 'root', combiningVowel: 'o', meaning: 'woman, female', meaningKo: '여성, 여자', origin: 'Gk. gyne', unit: 3 },
	{ id: 'mast', form: 'mast/o', type: 'root', combiningVowel: 'o', meaning: 'breast', meaningKo: '유방, 젖', origin: 'Gk. mastos', unit: 2 },
	{ id: 'hyster', form: 'hyster/o', type: 'root', combiningVowel: 'o', meaning: 'uterus, womb', meaningKo: '자궁', origin: 'Gk. hystera', unit: 3 },
	{ id: 'oophor', form: 'oophor/o', type: 'root', combiningVowel: 'o', meaning: 'ovary', meaningKo: '난소', origin: 'Gk. oophoron', unit: 3 },
	{ id: 'salping', form: 'salping/o', type: 'root', combiningVowel: 'o', meaning: 'fallopian (uterine) tube', meaningKo: '난관, 나팔관', origin: 'Gk. salpinx', unit: 3 },
	{ id: 'nat', form: 'nat/o, -natal', type: 'root', meaning: 'birth', meaningKo: '출생, 태어남', origin: 'L. natus', unit: 3 },
	{ id: 'amni', form: 'amni/o', type: 'root', combiningVowel: 'o', meaning: 'amnion, amniotic sac', meaningKo: '양막, 양수', origin: 'Gk. amnion', unit: 3 },
	{ id: 'orchi', form: 'orchi/o, orchid/o', type: 'root', variants: ['orchid'], combiningVowel: 'o', meaning: 'testis', meaningKo: '고환', origin: 'Gk. orchis', unit: 3 },
	{ id: 'prostat', form: 'prostat/o', type: 'root', combiningVowel: 'o', meaning: 'prostate gland', meaningKo: '전립선', origin: 'Gk. prostates', unit: 3 },
	{ id: 'vas', form: 'vas/o', type: 'root', combiningVowel: 'o', meaning: 'vessel, duct (vas deferens)', meaningKo: '관, 정관', origin: 'L. vas', unit: 3 },
	{ id: 'ophthalm', form: 'ophthalm/o', type: 'root', combiningVowel: 'o', meaning: 'eye', meaningKo: '눈', origin: 'Gk. ophthalmos', unit: 2 },
	{ id: 'retin', form: 'retin/o', type: 'root', combiningVowel: 'o', meaning: 'retina', meaningKo: '망막', origin: 'L. retina', unit: 3 },
	{ id: 'ot', form: 'ot/o', type: 'root', combiningVowel: 'o', meaning: 'ear', meaningKo: '귀', origin: 'Gk. ous', unit: 2 },
	{ id: 'derm', form: 'derm/o, dermat/o', type: 'root', variants: ['dermat'], combiningVowel: 'o', meaning: 'skin', meaningKo: '피부', origin: 'Gk. derma', unit: 2 },

	// ───────────────── Suffixes 접미사 ─────────────────
	{ id: 'itis', form: '-itis', type: 'suffix', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis', unit: 1 },
	{ id: 'ia', form: '-ia', type: 'suffix', meaning: 'condition, state', meaningKo: '~증, 상태', origin: 'Gk. -ia', unit: 1 },
	{ id: 'pathy', form: '-pathy', type: 'suffix', meaning: 'disease, suffering', meaningKo: '병증, 질환', origin: 'Gk. pathos', unit: 1 },
	{ id: 'osis', form: '-osis', type: 'suffix', meaning: 'abnormal condition, process', meaningKo: '비정상 상태, ~증', origin: 'Gk. -osis', unit: 1 },
	{ id: 'emia', form: '-emia, -hemia', type: 'suffix', variants: ['hemia'], meaning: 'blood condition', meaningKo: '혈액 상태, ~혈증', origin: 'Gk. haima', unit: 1 },
	{ id: 'uria', form: '-uria', type: 'suffix', meaning: 'urine condition', meaningKo: '뇨, 소변 상태', origin: 'Gk. ouron', unit: 1 },
	{ id: 'plasia', form: '-plasia', type: 'suffix', meaning: 'formation, development, growth of cells', meaningKo: '형성, 증식', origin: 'Gk. plasis', unit: 1 },
	{ id: 'al', form: '-al', type: 'suffix', meaning: 'pertaining to', meaningKo: '~의, ~에 관한', origin: 'L. -alis', unit: 1 },
	{ id: 'ous', form: '-ous', type: 'suffix', meaning: 'pertaining to', meaningKo: '~의, ~성의', origin: 'L. -osus', unit: 1 },
	{ id: 'ar', form: '-ar', type: 'suffix', meaning: 'pertaining to', meaningKo: '~의, ~에 관한', origin: 'L. -aris', unit: 2 },
	{ id: 'algia', form: '-algia', type: 'suffix', meaning: 'pain', meaningKo: '통증', origin: 'Gk. algos', unit: 2 },
	{ id: 'plegia', form: '-plegia', type: 'suffix', meaning: 'paralysis', meaningKo: '마비', origin: 'Gk. plege', unit: 2 },
	{ id: 'penia', form: '-penia', type: 'suffix', meaning: 'deficiency, decrease', meaningKo: '결핍, 감소증', origin: 'Gk. penia', unit: 2 },
	{ id: 'phagia', form: '-phagia', type: 'suffix', meaning: 'eating, swallowing', meaningKo: '삼킴, 섭식', origin: 'Gk. phagein', unit: 2 },
	{ id: 'philia', form: '-philia', type: 'suffix', meaning: 'attraction, affinity', meaningKo: '친화성, 기호', origin: 'Gk. philos', unit: 3 },
	{ id: 'ptysis', form: '-ptysis', type: 'suffix', meaning: 'spitting up, coughing up', meaningKo: '객출, 뱉음', origin: 'Gk. ptyein', unit: 3 },
	{ id: 'iasis', form: '-iasis', type: 'suffix', meaning: 'abnormal condition, presence of', meaningKo: '~증, 형성', origin: 'Gk. -iasis', unit: 3 },
	{ id: 'ectasis', form: '-ectasis', type: 'suffix', meaning: 'dilation, expansion', meaningKo: '확장, 팽창', origin: 'Gk. ektasis', unit: 3 },
	{ id: 'um', form: '-um', type: 'suffix', meaning: 'structure, tissue', meaningKo: '구조물, 조직', origin: 'L. -um', unit: 3 },
	{ id: 'us', form: '-us', type: 'suffix', meaning: 'structure, condition', meaningKo: '구조물, 상태', origin: 'L. -us', unit: 3 },

	// ── 수술/진단/검사 핵심 접미 (Unit 1~2) ──
	{ id: 'ectomy', form: '-ectomy', type: 'suffix', meaning: 'surgical removal, excision', meaningKo: '절제(술)', origin: 'Gk. ektomē', unit: 1 },
	{ id: 'otomy', form: '-otomy', type: 'suffix', meaning: 'incision, cutting into', meaningKo: '절개(술)', origin: 'Gk. tomē', unit: 1, note: '연결모음 o를 포함한 -otomy 형태로 자주 쓰임' },
	{ id: 'megaly', form: '-megaly', type: 'suffix', meaning: 'enlargement', meaningKo: '비대, 커짐', origin: 'Gk. megas', unit: 1 },
	{ id: 'oma', form: '-oma', type: 'suffix', meaning: 'tumor, mass', meaningKo: '종양, 덩이', origin: 'Gk. -ōma', unit: 1 },
	{ id: 'gram', form: '-gram', type: 'suffix', meaning: 'record, image', meaningKo: '기록물, 영상', origin: 'Gk. gramma', unit: 2 },
	{ id: 'graphy', form: '-graphy', type: 'suffix', meaning: 'process of recording, imaging', meaningKo: '촬영(법), 기록법', origin: 'Gk. graphē', unit: 2 },
	{ id: 'scopy', form: '-scopy', type: 'suffix', meaning: 'visual examination with a scope', meaningKo: '내시경 검사(들여다봄)', origin: 'Gk. skopein', unit: 2 },
	{ id: 'logy', form: '-logy', type: 'suffix', meaning: 'study of', meaningKo: '학(學), 학문', origin: 'Gk. logos', unit: 2 },
	{ id: 'pnea', form: '-pnea', type: 'suffix', meaning: 'breathing', meaningKo: '호흡', origin: 'Gk. pnoē', unit: 2 },
	{ id: 'centesis', form: '-centesis', type: 'suffix', meaning: 'surgical puncture to withdraw fluid', meaningKo: '천자(찔러 뽑기)', origin: 'Gk. kentesis', unit: 3 },

	// ───────────────── 확장 배치 v2 (그물 보강: 근골격·혈액·상기도·비뇨·종양·피부·안과·부인과) ─────────────────
	// roots
	{ id: 'arthr', form: 'arthr/o', type: 'root', combiningVowel: 'o', meaning: 'joint', meaningKo: '관절', origin: 'Gk. arthron', unit: 2 },
	{ id: 'chondr', form: 'chondr/o', type: 'root', combiningVowel: 'o', meaning: 'cartilage', meaningKo: '연골', origin: 'Gk. chondros', unit: 2 },
	{ id: 'myel', form: 'myel/o', type: 'root', combiningVowel: 'o', meaning: 'bone marrow, spinal cord', meaningKo: '골수, 척수', origin: 'Gk. myelos', unit: 2 },
	{ id: 'crani', form: 'crani/o', type: 'root', combiningVowel: 'o', meaning: 'skull, cranium', meaningKo: '두개골', origin: 'Gk. kranion', unit: 3 },
	{ id: 'splen', form: 'splen/o', type: 'root', combiningVowel: 'o', meaning: 'spleen', meaningKo: '비장, 지라', origin: 'Gk. splen', unit: 2 },
	{ id: 'lymph', form: 'lymph/o', type: 'root', combiningVowel: 'o', meaning: 'lymph, lymphatic tissue', meaningKo: '림프', origin: 'L. lympha', unit: 2 },
	{ id: 'erythr', form: 'erythr/o', type: 'root', combiningVowel: 'o', meaning: 'red', meaningKo: '적색, 붉은', origin: 'Gk. erythros', unit: 2 },
	{ id: 'rhin', form: 'rhin/o', type: 'root', combiningVowel: 'o', meaning: 'nose', meaningKo: '코', origin: 'Gk. rhis', unit: 2 },
	{ id: 'laryng', form: 'laryng/o', type: 'root', combiningVowel: 'o', meaning: 'larynx, voice box', meaningKo: '후두', origin: 'Gk. larynx', unit: 2 },
	{ id: 'pharyng', form: 'pharyng/o', type: 'root', combiningVowel: 'o', meaning: 'pharynx, throat', meaningKo: '인두', origin: 'Gk. pharynx', unit: 3 },
	{ id: 'trache', form: 'trache/o', type: 'root', combiningVowel: 'o', meaning: 'trachea, windpipe', meaningKo: '기관', origin: 'Gk. tracheia', unit: 2 },
	{ id: 'col', form: 'col/o', type: 'root', combiningVowel: 'o', meaning: 'colon, large intestine', meaningKo: '결장, 대장', origin: 'Gk. kolon', unit: 2 },
	{ id: 'proct', form: 'proct/o', type: 'root', combiningVowel: 'o', meaning: 'rectum, anus', meaningKo: '직장, 항문', origin: 'Gk. proktos', unit: 3 },
	{ id: 'pyel', form: 'pyel/o', type: 'root', combiningVowel: 'o', meaning: 'renal pelvis', meaningKo: '신우', origin: 'Gk. pyelos', unit: 3 },
	{ id: 'ur', form: 'ur/o', type: 'root', combiningVowel: 'o', meaning: 'urine, urinary tract', meaningKo: '요, 비뇨(계)', origin: 'Gk. ouron', unit: 2 },
	{ id: 'carcin', form: 'carcin/o', type: 'root', combiningVowel: 'o', meaning: 'cancer, carcinoma', meaningKo: '암(癌)', origin: 'Gk. karkinos', unit: 2 },
	{ id: 'melan', form: 'melan/o', type: 'root', combiningVowel: 'o', meaning: 'black, melanin', meaningKo: '흑색, 멜라닌', origin: 'Gk. melas', unit: 2 },
	{ id: 'myc', form: 'myc/o', type: 'root', combiningVowel: 'o', meaning: 'fungus', meaningKo: '진균, 곰팡이', origin: 'Gk. mykes', unit: 3 },
	{ id: 'lip', form: 'lip/o', type: 'root', combiningVowel: 'o', meaning: 'fat, lipid', meaningKo: '지방', origin: 'Gk. lipos', unit: 2 },
	{ id: 'kerat', form: 'kerat/o', type: 'root', combiningVowel: 'o', meaning: 'cornea, horny/keratin tissue', meaningKo: '각막, 각질', origin: 'Gk. keras', unit: 3 },
	{ id: 'onych', form: 'onych/o', type: 'root', combiningVowel: 'o', meaning: 'nail', meaningKo: '손발톱', origin: 'Gk. onyx', unit: 3 },
	{ id: 'blephar', form: 'blephar/o', type: 'root', combiningVowel: 'o', meaning: 'eyelid', meaningKo: '눈꺼풀', origin: 'Gk. blepharon', unit: 3 },
	{ id: 'ocul', form: 'ocul/o', type: 'root', combiningVowel: 'o', meaning: 'eye', meaningKo: '눈, 안구', origin: 'L. oculus', unit: 2 },
	{ id: 'men', form: 'men/o', type: 'root', combiningVowel: 'o', meaning: 'menstruation, menses', meaningKo: '월경', origin: 'Gk. men (month)', unit: 2 },
	{ id: 'metr', form: 'metr/o', type: 'root', combiningVowel: 'o', meaning: 'uterus', meaningKo: '자궁', origin: 'Gk. metra', unit: 2, note: '측정 접미 -metry와 어원이 다름(여기선 자궁)' },
	{ id: 'colp', form: 'colp/o', type: 'root', combiningVowel: 'o', meaning: 'vagina', meaningKo: '질(膣)', origin: 'Gk. kolpos', unit: 3 },
	{ id: 'acr', form: 'acr/o', type: 'root', combiningVowel: 'o', meaning: 'extremities, peak, top', meaningKo: '말단, 끝', origin: 'Gk. akron', unit: 3 },
	// suffixes
	{ id: 'rrhea', form: '-rrhea', type: 'suffix', meaning: 'flow, discharge', meaningKo: '흐름, 분비', origin: 'Gk. rhoia', unit: 2 },
	{ id: 'rrhagia', form: '-rrhagia', type: 'suffix', meaning: 'bursting forth, hemorrhage', meaningKo: '출혈, 터져 나옴', origin: 'Gk. rhegnynai', unit: 3 },
	{ id: 'plasty', form: '-plasty', type: 'suffix', meaning: 'surgical repair, reconstruction', meaningKo: '성형술, 재건', origin: 'Gk. plassein', unit: 2 },
	{ id: 'stomy', form: '-stomy', type: 'suffix', meaning: 'surgical creation of an opening', meaningKo: '조루술(연결 구멍 만들기)', origin: 'Gk. stoma', unit: 2 },
	{ id: 'malacia', form: '-malacia', type: 'suffix', meaning: 'softening', meaningKo: '연화증', origin: 'Gk. malakia', unit: 3 },
	{ id: 'ptosis', form: '-ptosis', type: 'suffix', meaning: 'drooping, prolapse, sagging', meaningKo: '처짐, 하수', origin: 'Gk. ptosis', unit: 3 },
	{ id: 'logist', form: '-logist', type: 'suffix', meaning: 'specialist, one who studies', meaningKo: '전문의, ~학자', origin: 'Gk. logos', unit: 2 },
	{ id: 'dipsia', form: '-dipsia', type: 'suffix', meaning: 'thirst', meaningKo: '갈증', origin: 'Gk. dipsa', unit: 3 },

	// ───────────────── 확장 배치 v3 (보정사 용어집 빈도순 보강: 비뇨생식·심장·치과구강·척추·정신·내분비) ─────────────────
	// affixes
	{ id: 'inter', form: 'inter-', type: 'prefix', meaning: 'between, among', meaningKo: '사이, ~간', origin: 'L. inter', unit: 2 },
	{ id: 'ic', form: '-ic', type: 'suffix', meaning: 'pertaining to', meaningKo: '~의, ~성의', origin: 'Gk./L. -icus', unit: 1 },
	{ id: 'genesis', form: '-genesis', type: 'suffix', meaning: 'formation, production, origin', meaningKo: '발생, 형성', origin: 'Gk. genesis', unit: 2 },
	{ id: 'cele', form: '-cele', type: 'suffix', meaning: 'hernia, protrusion, swelling', meaningKo: '탈출, 류(瘤)', origin: 'Gk. kele', unit: 3 },
	// roots — 비뇨생식
	{ id: 'vagin', form: 'vagin/o', type: 'root', combiningVowel: 'o', meaning: 'vagina', meaningKo: '질(膣)', origin: 'L. vagina', unit: 2 },
	{ id: 'urethr', form: 'urethr/o', type: 'root', combiningVowel: 'o', meaning: 'urethra', meaningKo: '요도', origin: 'Gk. ourethra', unit: 2 },
	{ id: 'ureter', form: 'ureter/o', type: 'root', combiningVowel: 'o', meaning: 'ureter', meaningKo: '요관', origin: 'Gk. oureter', unit: 2 },
	{ id: 'balan', form: 'balan/o', type: 'root', combiningVowel: 'o', meaning: 'glans penis', meaningKo: '귀두', origin: 'Gk. balanos', unit: 3 },
	{ id: 'epididym', form: 'epididym/o', type: 'root', combiningVowel: 'o', meaning: 'epididymis', meaningKo: '부고환', origin: 'Gk. epididymis', unit: 3 },
	{ id: 'placent', form: 'placent/o', type: 'root', combiningVowel: 'o', meaning: 'placenta', meaningKo: '태반', origin: 'L. placenta', unit: 3 },
	{ id: 'mamm', form: 'mamm/o', type: 'root', combiningVowel: 'o', meaning: 'breast', meaningKo: '유방', origin: 'L. mamma', unit: 2 },
	// roots — 심장·혈관
	{ id: 'ventricul', form: 'ventricul/o', type: 'root', combiningVowel: 'o', meaning: 'ventricle (heart or brain)', meaningKo: '심실, 뇌실', origin: 'L. ventriculus', unit: 2 },
	{ id: 'atri', form: 'atri/o', type: 'root', combiningVowel: 'o', meaning: 'atrium (heart chamber)', meaningKo: '심방', origin: 'L. atrium', unit: 2 },
	{ id: 'valvul', form: 'valvul/o', type: 'root', combiningVowel: 'o', meaning: 'valve', meaningKo: '판막', origin: 'L. valvula', unit: 2 },
	{ id: 'sept', form: 'sept/o', type: 'root', combiningVowel: 'o', meaning: 'septum, wall', meaningKo: '중격, 사이막', origin: 'L. septum', unit: 3 },
	{ id: 'aort', form: 'aort/o', type: 'root', combiningVowel: 'o', meaning: 'aorta', meaningKo: '대동맥', origin: 'Gk. aorte', unit: 2 },
	// roots — 감염·병리
	{ id: 'vir', form: 'vir/o', type: 'root', combiningVowel: 'o', meaning: 'virus', meaningKo: '바이러스', origin: 'L. virus', unit: 2 },
	{ id: 'bacter', form: 'bacteri/o', type: 'root', combiningVowel: 'o', meaning: 'bacteria', meaningKo: '세균', origin: 'Gk. bakterion', unit: 2 },
	{ id: 'parasit', form: 'parasit/o', type: 'root', combiningVowel: 'o', meaning: 'parasite', meaningKo: '기생충', origin: 'Gk. parasitos', unit: 3 },
	{ id: 'tox', form: 'tox/o, toxic/o', type: 'root', variants: ['toxic'], combiningVowel: 'o', meaning: 'poison, toxin', meaningKo: '독, 독소', origin: 'Gk. toxikon', unit: 2 },
	// roots — 치과·구강·인후
	{ id: 'odont', form: 'odont/o', type: 'root', combiningVowel: 'o', meaning: 'tooth', meaningKo: '치아', origin: 'Gk. odous', unit: 2 },
	{ id: 'stomat', form: 'stomat/o', type: 'root', combiningVowel: 'o', meaning: 'mouth', meaningKo: '입, 구강', origin: 'Gk. stoma', unit: 2 },
	{ id: 'gloss', form: 'gloss/o', type: 'root', combiningVowel: 'o', meaning: 'tongue', meaningKo: '혀', origin: 'Gk. glossa', unit: 3 },
	{ id: 'gingiv', form: 'gingiv/o', type: 'root', combiningVowel: 'o', meaning: 'gums', meaningKo: '잇몸, 치은', origin: 'L. gingiva', unit: 3 },
	{ id: 'uvul', form: 'uvul/o', type: 'root', combiningVowel: 'o', meaning: 'uvula', meaningKo: '목젖, 구개수', origin: 'L. uvula', unit: 3 },
	{ id: 'tympan', form: 'tympan/o', type: 'root', combiningVowel: 'o', meaning: 'eardrum, tympanic membrane', meaningKo: '고막', origin: 'Gk. tympanon', unit: 3 },
	// roots — 척추·근골격
	{ id: 'spondyl', form: 'spondyl/o', type: 'root', combiningVowel: 'o', meaning: 'vertebra', meaningKo: '척추뼈', origin: 'Gk. spondylos', unit: 2 },
	{ id: 'vertebr', form: 'vertebr/o', type: 'root', combiningVowel: 'o', meaning: 'vertebra, spine', meaningKo: '척추', origin: 'L. vertebra', unit: 2 },
	{ id: 'cost', form: 'cost/o', type: 'root', combiningVowel: 'o', meaning: 'rib', meaningKo: '늑골, 갈비뼈', origin: 'L. costa', unit: 2 },
	{ id: 'tendin', form: 'tendin/o, ten/o', type: 'root', variants: ['ten'], combiningVowel: 'o', meaning: 'tendon', meaningKo: '힘줄, 건', origin: 'L. tendo', unit: 3 },
	// roots — 정신·신경
	{ id: 'psych', form: 'psych/o', type: 'root', combiningVowel: 'o', meaning: 'mind, mental', meaningKo: '정신, 마음', origin: 'Gk. psyche', unit: 2 },
	// roots — 내분비
	{ id: 'thym', form: 'thym/o', type: 'root', combiningVowel: 'o', meaning: 'thymus gland', meaningKo: '흉선, 가슴샘', origin: 'Gk. thymos', unit: 3 },
	{ id: 'adren', form: 'adren/o', type: 'root', combiningVowel: 'o', meaning: 'adrenal gland', meaningKo: '부신', origin: 'L. ad-+ren', unit: 2 },
	{ id: 'calc', form: 'calc/o, calci/o', type: 'root', variants: ['calci'], combiningVowel: 'o', meaning: 'calcium', meaningKo: '칼슘', origin: 'L. calx', unit: 3 },
	// roots — 눈
	{ id: 'irid', form: 'irid/o', type: 'root', combiningVowel: 'o', meaning: 'iris (of the eye)', meaningKo: '홍채', origin: 'Gk. iris', unit: 3 },
	{ id: 'conjunctiv', form: 'conjunctiv/o', type: 'root', combiningVowel: 'o', meaning: 'conjunctiva', meaningKo: '결막', origin: 'L. conjunctiva', unit: 3 },
	// roots — 피부
	{ id: 'xanth', form: 'xanth/o', type: 'root', combiningVowel: 'o', meaning: 'yellow', meaningKo: '황색, 노란', origin: 'Gk. xanthos', unit: 3 },
	{ id: 'steat', form: 'steat/o', type: 'root', combiningVowel: 'o', meaning: 'fat, sebum', meaningKo: '지방, 피지', origin: 'Gk. stear', unit: 3 },
	{ id: 'hidr', form: 'hidr/o', type: 'root', combiningVowel: 'o', meaning: 'sweat', meaningKo: '땀', origin: 'Gk. hidros', unit: 3 },
	{ id: 'trich', form: 'trich/o', type: 'root', combiningVowel: 'o', meaning: 'hair', meaningKo: '털, 모발', origin: 'Gk. thrix', unit: 3 },

	// ───────────────── 확장 배치 v4 (NBK 어원 인벤토리 합류 · CC-BY 출처) ─────────────────
	// prefixes — 표준 의학 접두사 인벤토리 (한국어 뜻 직접 작성, 출처 nbk-ch1)
	{ id: 'anti', form: 'anti-', type: 'prefix', meaning: 'against, opposing', meaningKo: '항-, 대항', origin: 'Gk. anti', unit: 1, source: 'nbk-ch1' },
	{ id: 'auto', form: 'auto-, aut-', type: 'prefix', variants: ['aut'], meaning: 'self', meaningKo: '자기-, 스스로', origin: 'Gk. autos', unit: 2, source: 'nbk-ch1' },
	{ id: 'dia', form: 'dia-', type: 'prefix', meaning: 'through, across, apart', meaningKo: '통과, 가로질러', origin: 'Gk. dia', unit: 2, source: 'nbk-ch1' },
	{ id: 'trans', form: 'trans-', type: 'prefix', meaning: 'across, through', meaningKo: '가로질러, 경(經)-', origin: 'L. trans', unit: 2, source: 'nbk-ch1' },
	{ id: 'para', form: 'para-', type: 'prefix', meaning: 'beside, beyond, abnormal', meaningKo: '곁, 옆, 비정상', origin: 'Gk. para', unit: 2, source: 'nbk-ch1' },
	{ id: 'retro', form: 'retro-', type: 'prefix', meaning: 'behind, backward', meaningKo: '뒤, 후방', origin: 'L. retro', unit: 2, source: 'nbk-ch1' },
	{ id: 'circum', form: 'circum-', type: 'prefix', meaning: 'around', meaningKo: '둘레, 주위', origin: 'L. circum', unit: 2, source: 'nbk-ch1' },
	{ id: 'contra', form: 'contra-', type: 'prefix', meaning: 'against, opposite', meaningKo: '반대, 대항', origin: 'L. contra', unit: 2, source: 'nbk-ch1' },
	{ id: 'extra', form: 'extra-', type: 'prefix', meaning: 'outside, beyond', meaningKo: '바깥, ~외', origin: 'L. extra', unit: 2, source: 'nbk-ch1' },
	{ id: 'infra', form: 'infra-', type: 'prefix', meaning: 'below, beneath', meaningKo: '아래, 하부', origin: 'L. infra', unit: 3, source: 'nbk-ch1' },
	{ id: 'super', form: 'super-', type: 'prefix', meaning: 'above, excessive', meaningKo: '위, 과도, 상(上)', origin: 'L. super', unit: 2, source: 'nbk-ch1' },
	{ id: 'ultra', form: 'ultra-', type: 'prefix', meaning: 'beyond, excessive', meaningKo: '초과, ~이상', origin: 'L. ultra', unit: 3, source: 'nbk-ch1' },
	{ id: 'macro', form: 'macro-', type: 'prefix', meaning: 'large', meaningKo: '큰, 대(大)-', origin: 'Gk. makros', unit: 2, source: 'nbk-ch1' },
	{ id: 'micro', form: 'micro-', type: 'prefix', meaning: 'small, tiny', meaningKo: '작은, 미세-', origin: 'Gk. mikros', unit: 1, source: 'nbk-ch1' },
	{ id: 'mono', form: 'mono-', type: 'prefix', meaning: 'one, single', meaningKo: '하나, 단일-', origin: 'Gk. monos', unit: 2, source: 'nbk-ch1' },
	{ id: 'multi', form: 'multi-, mult-', type: 'prefix', variants: ['mult'], meaning: 'many, multiple', meaningKo: '많은, 다수-', origin: 'L. multus', unit: 2, source: 'nbk-ch1' },
	{ id: 'uni', form: 'uni-', type: 'prefix', meaning: 'one', meaningKo: '하나, 단(單)-', origin: 'L. unus', unit: 2, source: 'nbk-ch1' },
	{ id: 'tri', form: 'tri-', type: 'prefix', meaning: 'three', meaningKo: '셋, 삼(三)-', origin: 'Gk./L. tri', unit: 2, source: 'nbk-ch1' },
	{ id: 'quadri', form: 'quadri-', type: 'prefix', meaning: 'four', meaningKo: '넷, 사(四)-', origin: 'L. quattuor', unit: 3, source: 'nbk-ch1' },
	{ id: 'pan', form: 'pan-', type: 'prefix', meaning: 'all', meaningKo: '전체, 범(汎)-', origin: 'Gk. pan', unit: 2, source: 'nbk-ch1' },
	{ id: 'pseudo', form: 'pseudo-', type: 'prefix', meaning: 'false', meaningKo: '거짓, 가성(假性)-', origin: 'Gk. pseudes', unit: 2, source: 'nbk-ch1' },
	{ id: 'ortho', form: 'ortho-', type: 'prefix', meaning: 'straight, normal', meaningKo: '곧은, 정상-', origin: 'Gk. orthos', unit: 2, source: 'nbk-ch1' },
	{ id: 'ante', form: 'ante-', type: 'prefix', meaning: 'before, in front of', meaningKo: '이전, 앞', origin: 'L. ante', unit: 2, source: 'nbk-ch1' },
	{ id: 'ana', form: 'ana-', type: 'prefix', meaning: 'up, apart, again', meaningKo: '위로, 분리, 다시', origin: 'Gk. ana', unit: 3, source: 'nbk-ch1' },
	{ id: 'cata', form: 'cata-', type: 'prefix', meaning: 'down, against', meaningKo: '아래, 하강', origin: 'Gk. kata', unit: 3, source: 'nbk-ch1' },
	{ id: 'semi', form: 'semi-', type: 'prefix', meaning: 'half, partial', meaningKo: '반, 부분', origin: 'L. semi', unit: 2, source: 'nbk-ch1' },
	{ id: 'iso', form: 'iso-', type: 'prefix', meaning: 'equal, same', meaningKo: '같은, 동등-', origin: 'Gk. isos', unit: 3, source: 'nbk-ch1' },
	{ id: 'mal', form: 'mal-', type: 'prefix', meaning: 'bad, abnormal', meaningKo: '나쁜, 비정상', origin: 'L. malus', unit: 2, source: 'nbk-ch1' },
	{ id: 'brachy', form: 'brachy-', type: 'prefix', meaning: 'short', meaningKo: '짧은', origin: 'Gk. brachys', unit: 3, source: 'nbk-ch1' },
	{ id: 'presby', form: 'presby-', type: 'prefix', meaning: 'old age', meaningKo: '노년, 노인성', origin: 'Gk. presbys', unit: 3, source: 'nbk-ch1' },
	{ id: 'ambi', form: 'ambi-', type: 'prefix', meaning: 'both', meaningKo: '양쪽', origin: 'L. ambi', unit: 3, source: 'nbk-ch1' },
	{ id: 'sym', form: 'sym-', type: 'prefix', meaning: 'together, with', meaningKo: '함께, 동반', origin: 'Gk. syn', unit: 3, source: 'nbk-ch1' },
	// roots — NBK 추가 어근
	{ id: 'abdomin', form: 'abdomin/o', type: 'root', combiningVowel: 'o', meaning: 'abdomen', meaningKo: '복부, 배', origin: 'L. abdomen', unit: 2, source: 'nbk-ch1' },
	{ id: 'andr', form: 'andr/o', type: 'root', combiningVowel: 'o', meaning: 'male, man', meaningKo: '남성', origin: 'Gk. aner', unit: 2, source: 'nbk-ch1' },
	{ id: 'audi', form: 'audi/o', type: 'root', combiningVowel: 'o', meaning: 'hearing', meaningKo: '청각, 듣기', origin: 'L. audire', unit: 2, source: 'nbk-ch1' },
	{ id: 'opt', form: 'opt/o', type: 'root', combiningVowel: 'o', meaning: 'vision, eye', meaningKo: '시각, 눈', origin: 'Gk. optikos', unit: 2, source: 'nbk-ch1' },
	{ id: 'hist', form: 'hist/o', type: 'root', combiningVowel: 'o', meaning: 'tissue', meaningKo: '조직', origin: 'Gk. histos', unit: 2, source: 'nbk-ch1' },
	{ id: 'duoden', form: 'duoden/o', type: 'root', combiningVowel: 'o', meaning: 'duodenum', meaningKo: '십이지장', origin: 'L. duodeni', unit: 3, source: 'nbk-ch1' },
	{ id: 'esophag', form: 'esophag/o', type: 'root', combiningVowel: 'o', meaning: 'esophagus', meaningKo: '식도', origin: 'Gk. oisophagos', unit: 2, source: 'nbk-ch1' },
	// suffix
	{ id: 'ac', form: '-ac', type: 'suffix', meaning: 'pertaining to', meaningKo: '~의, ~에 관한', origin: 'Gk. -akos', unit: 2, source: 'nbk-ch1' },
	// ── 보정사 임신·출산/남성생식 계통 보강 어근 (그물 갭 채우기) ──
	{ id: 'embry', form: 'embry/o', type: 'root', combiningVowel: 'o', meaning: 'embryo', meaningKo: '배아', origin: 'Gk. embryon', unit: 3 },
	{ id: 'fet', form: 'fet/o', type: 'root', combiningVowel: 'o', meaning: 'fetus', meaningKo: '태아', origin: 'L. fetus', unit: 3 },
	{ id: 'lact', form: 'lact/o', type: 'root', combiningVowel: 'o', meaning: 'milk', meaningKo: '젖, 유즙', origin: 'L. lac, lactis', unit: 3 },
	{ id: 'toc', form: 'toc/o', type: 'root', combiningVowel: 'o', meaning: 'birth, labor', meaningKo: '분만, 진통', origin: 'Gk. tokos', unit: 3 },
	{ id: 'spermat', form: 'spermat/o', type: 'root', combiningVowel: 'o', meaning: 'sperm, seed', meaningKo: '정자', origin: 'Gk. sperma', unit: 3 },
	{ id: 'scrot', form: 'scrot/o', type: 'root', combiningVowel: 'o', meaning: 'scrotum', meaningKo: '음낭', origin: 'L. scrotum', unit: 3 },
	// ── 용어집 커버리지 보강: 고빈도 누락 접미사 (분해율 레버) ──
	{ id: 'lysis', form: '-lysis', type: 'suffix', meaning: 'breakdown, destruction', meaningKo: '분해, 파괴', origin: 'Gk. lysis', unit: 2 },
	{ id: 'trophy', form: '-trophy', type: 'suffix', meaning: 'development, nourishment', meaningKo: '발육, 영양', origin: 'Gk. trophe', unit: 2 },
	{ id: 'phasia', form: '-phasia', type: 'suffix', meaning: 'speech', meaningKo: '언어능력, 말하기', origin: 'Gk. phasis', unit: 2 },
	{ id: 'opia', form: '-opia', type: 'suffix', meaning: 'vision condition', meaningKo: '시력 상태', origin: 'Gk. ops', unit: 2 },
	{ id: 'stasis', form: '-stasis', type: 'suffix', meaning: 'standstill, stoppage', meaningKo: '정체, 멈춤', origin: 'Gk. stasis', unit: 2 },
	{ id: 'blast', form: '-blast', type: 'suffix', meaning: 'immature cell', meaningKo: '미성숙 세포, 모세포', origin: 'Gk. blastos', unit: 2 },
	{ id: 'spasm', form: '-spasm', type: 'suffix', meaning: 'sudden contraction', meaningKo: '경련', origin: 'Gk. spasmos', unit: 2 },
	{ id: 'emesis', form: '-emesis', type: 'suffix', meaning: 'vomiting', meaningKo: '구토', origin: 'Gk. emesis', unit: 3 },
	// ── 용어집 커버리지 보강: 고빈도 누락 어근 (가운데 root) ──
	{ id: 'ren', form: 'ren/o', type: 'root', combiningVowel: 'o', meaning: 'kidney', meaningKo: '신장, 콩팥', origin: 'L. ren', unit: 2, note: 'nephr/o(Gk.)와 같은 뜻 — renal 등 라틴 계열' },
	{ id: 'uter', form: 'uter/o', type: 'root', combiningVowel: 'o', meaning: 'uterus', meaningKo: '자궁', origin: 'L. uterus', unit: 2, note: 'hyster/o·metr/o와 같은 뜻 — 라틴 계열' },
	{ id: 'rect', form: 'rect/o', type: 'root', combiningVowel: 'o', meaning: 'rectum', meaningKo: '직장', origin: 'L. rectum', unit: 2 },
	{ id: 'nas', form: 'nas/o', type: 'root', combiningVowel: 'o', meaning: 'nose', meaningKo: '코', origin: 'L. nasus', unit: 2, note: 'rhin/o(Gk.)와 같은 뜻 — 라틴 계열' },
	{ id: 'cervic', form: 'cervic/o', type: 'root', combiningVowel: 'o', meaning: 'neck, cervix', meaningKo: '목, 자궁경부', origin: 'L. cervix', unit: 2 },
	{ id: 'vascul', form: 'vascul/o', type: 'root', combiningVowel: 'o', meaning: 'vessel', meaningKo: '혈관', origin: 'L. vasculum', unit: 2, note: 'angi/o(Gk.)와 같은 뜻 — vascular 등' },
	{ id: 'cyan', form: 'cyan/o', type: 'root', combiningVowel: 'o', meaning: 'blue', meaningKo: '청색, 파란', origin: 'Gk. kyanos', unit: 2 },
	{ id: 'lapar', form: 'lapar/o', type: 'root', combiningVowel: 'o', meaning: 'abdominal wall', meaningKo: '복벽, 배', origin: 'Gk. lapara', unit: 3 },
	{ id: 'varic', form: 'varic/o', type: 'root', combiningVowel: 'o', meaning: 'dilated vein', meaningKo: '정맥류, 정맥확장', origin: 'L. varix', unit: 3 },
	{ id: 'alveol', form: 'alveol/o', type: 'root', combiningVowel: 'o', meaning: 'alveolus', meaningKo: '폐포, 치조', origin: 'L. alveolus', unit: 3 },
	{ id: 'cellul', form: 'cellul/o', type: 'root', combiningVowel: 'o', meaning: 'cell', meaningKo: '세포', origin: 'L. cellula', unit: 3, note: 'cyt/o(Gk.)와 같은 뜻 — cellular 등' },
	{ id: 'py', form: 'py/o', type: 'root', combiningVowel: 'o', meaning: 'pus', meaningKo: '고름, 농', origin: 'Gk. pyon', unit: 3 }
];

export const morphemeById: Record<string, Morpheme> = Object.fromEntries(morphemes.map((m) => [m.id, m]));

/** 검수 완료 여부. 생략 = 검수됨. */
export const isVerified = (m: Morpheme) => m.verified !== false;
/** 학습(강의실 큐 등)에 쓰는 어원 — 검수됐고 한국어 뜻이 있는 것만. */
export const learnableMorphemes: Morpheme[] = morphemes.filter((m) => isVerified(m) && m.meaningKo.trim().length > 0);

/** morpheme id 배열 → Morpheme 배열 (없는 id는 건너뜀). */
export function partsToMorphemes(parts: string[]): Morpheme[] {
	return parts.map((id) => morphemeById[id]).filter((m): m is Morpheme => !!m);
}

export const TYPE_LABEL_KO: Record<MorphemeType, string> = {
	prefix: '접두사',
	root: '어근',
	suffix: '접미사'
};
