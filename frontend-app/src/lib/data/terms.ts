export interface EtymologyPart {
	part: string;
	meaning: string;
	meaningKo: string;
	origin: string;
}

export interface MedicalTerm {
	id: string;
	term: string;
	korean: string;
	definition: string;
	definitionKo: string;
	etymology: EtymologyPart[];
	category: string;
}

export const CATEGORIES: Record<string, string> = {
	cardiology: '심장학',
	neurology: '신경학',
	pulmonology: '호흡기학',
	gastroenterology: '소화기학',
	nephrology: '신장학',
	hematology: '혈액학',
	pathology: '병리학',
	anatomy: '해부학'
};

export const terms: MedicalTerm[] = [
	// ── Cardiology 심장학 ──────────────────────────────────────────
	{
		id: 'cardiomyopathy',
		term: 'Cardiomyopathy',
		korean: '심근병증',
		definition: 'A disease of the heart muscle that makes it harder for your heart to pump blood to the rest of your body.',
		definitionKo: '심장 근육의 질환으로, 심장이 온몸으로 혈액을 펌프질하는 것을 어렵게 만듭니다.',
		etymology: [
			{ part: 'Cardio-', meaning: 'heart', meaningKo: '심장', origin: 'Gk. kardia' },
			{ part: '-myo-', meaning: 'muscle', meaningKo: '근육', origin: 'Gk. mys' },
			{ part: '-pathy', meaning: 'disease', meaningKo: '병증', origin: 'Gk. pathos' }
		],
		category: 'cardiology'
	},
	{
		id: 'tachycardia',
		term: 'Tachycardia',
		korean: '빈맥',
		definition: 'An abnormally fast heart rate, typically over 100 beats per minute at rest.',
		definitionKo: '안정 시 분당 100회 이상의 비정상적으로 빠른 심박수입니다.',
		etymology: [
			{ part: 'Tachy-', meaning: 'fast', meaningKo: '빠른', origin: 'Gk. tachys' },
			{ part: '-cardia', meaning: 'heart condition', meaningKo: '심장 상태', origin: 'Gk. kardia' }
		],
		category: 'cardiology'
	},
	{
		id: 'bradycardia',
		term: 'Bradycardia',
		korean: '서맥',
		definition: 'An abnormally slow heart rate, typically fewer than 60 beats per minute at rest.',
		definitionKo: '안정 시 분당 60회 미만의 비정상적으로 느린 심박수입니다.',
		etymology: [
			{ part: 'Brady-', meaning: 'slow', meaningKo: '느린', origin: 'Gk. bradys' },
			{ part: '-cardia', meaning: 'heart condition', meaningKo: '심장 상태', origin: 'Gk. kardia' }
		],
		category: 'cardiology'
	},
	{
		id: 'atherosclerosis',
		term: 'Atherosclerosis',
		korean: '죽상동맥경화증',
		definition: 'Hardening and narrowing of arteries due to plaque buildup on their inner walls.',
		definitionKo: '동맥 내벽에 플라크가 쌓여 동맥이 굳고 좁아지는 질환입니다.',
		etymology: [
			{ part: 'Athero-', meaning: 'plaque/gruel', meaningKo: '죽상/플라크', origin: 'Gk. athere' },
			{ part: '-sclero-', meaning: 'hard', meaningKo: '경화', origin: 'Gk. skleros' },
			{ part: '-osis', meaning: 'condition', meaningKo: '상태/증', origin: 'Gk. -osis' }
		],
		category: 'cardiology'
	},
	{
		id: 'myocardial-infarction',
		term: 'Myocardial Infarction',
		korean: '심근경색',
		definition: 'Death of heart muscle tissue due to blockage of a coronary artery, commonly called a heart attack.',
		definitionKo: '관상동맥 폐색으로 인한 심근 조직의 괴사이며, 흔히 심장마비라고 합니다.',
		etymology: [
			{ part: 'Myo-', meaning: 'muscle', meaningKo: '근육', origin: 'Gk. mys' },
			{ part: '-cardial', meaning: 'of the heart', meaningKo: '심장의', origin: 'Gk. kardia' },
			{ part: 'Infarction', meaning: 'tissue death from obstruction', meaningKo: '경색', origin: 'L. infarcire' }
		],
		category: 'cardiology'
	},
	{
		id: 'pericarditis',
		term: 'Pericarditis',
		korean: '심낭염',
		definition: 'Inflammation of the pericardium, the thin sac-like membrane surrounding the heart.',
		definitionKo: '심장을 둘러싸는 얇은 주머니 모양의 막인 심낭의 염증입니다.',
		etymology: [
			{ part: 'Peri-', meaning: 'around', meaningKo: '주위', origin: 'Gk. peri' },
			{ part: '-cardio-', meaning: 'heart', meaningKo: '심장', origin: 'Gk. kardia' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'cardiology'
	},
	{
		id: 'arrhythmia',
		term: 'Arrhythmia',
		korean: '부정맥',
		definition: 'An irregular heartbeat; the heart may beat too fast, too slow, or with an irregular pattern.',
		definitionKo: '불규칙한 심장 박동으로, 너무 빠르거나 느리거나 불규칙한 패턴으로 뛸 수 있습니다.',
		etymology: [
			{ part: 'A-', meaning: 'without/not', meaningKo: '~없는', origin: 'Gk. a-' },
			{ part: '-rhythmia', meaning: 'rhythm', meaningKo: '리듬', origin: 'Gk. rhythmos' }
		],
		category: 'cardiology'
	},
	{
		id: 'endocarditis',
		term: 'Endocarditis',
		korean: '심내막염',
		definition: 'Infection and inflammation of the inner lining of the heart chambers and valves.',
		definitionKo: '심장 내부 및 판막의 내벽 감염 및 염증입니다.',
		etymology: [
			{ part: 'Endo-', meaning: 'within/inner', meaningKo: '내부', origin: 'Gk. endon' },
			{ part: '-cardio-', meaning: 'heart', meaningKo: '심장', origin: 'Gk. kardia' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'cardiology'
	},

	// ── Neurology 신경학 ───────────────────────────────────────────
	{
		id: 'encephalitis',
		term: 'Encephalitis',
		korean: '뇌염',
		definition: 'Inflammation of the brain, usually caused by a viral infection.',
		definitionKo: '주로 바이러스 감염으로 인한 뇌의 염증입니다.',
		etymology: [
			{ part: 'Encephalo-', meaning: 'brain', meaningKo: '뇌', origin: 'Gk. enkephalos' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'neurology'
	},
	{
		id: 'meningitis',
		term: 'Meningitis',
		korean: '수막염',
		definition: 'Inflammation of the meninges, the protective membranes covering the brain and spinal cord.',
		definitionKo: '뇌와 척수를 덮는 보호막인 수막의 염증입니다.',
		etymology: [
			{ part: 'Meningo-', meaning: 'membrane', meaningKo: '막/수막', origin: 'Gk. meninx' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'neurology'
	},
	{
		id: 'neuralgia',
		term: 'Neuralgia',
		korean: '신경통',
		definition: 'Intense, typically intermittent pain along the course of a nerve.',
		definitionKo: '신경 경로를 따라 나타나는 강렬하고 주로 간헐적인 통증입니다.',
		etymology: [
			{ part: 'Neur-', meaning: 'nerve', meaningKo: '신경', origin: 'Gk. neuron' },
			{ part: '-algia', meaning: 'pain', meaningKo: '통증', origin: 'Gk. algos' }
		],
		category: 'neurology'
	},
	{
		id: 'hemiplegia',
		term: 'Hemiplegia',
		korean: '편마비',
		definition: 'Paralysis of one side of the body, typically caused by stroke or brain injury.',
		definitionKo: '주로 뇌졸중이나 뇌 손상으로 인한 신체 한쪽의 마비입니다.',
		etymology: [
			{ part: 'Hemi-', meaning: 'half', meaningKo: '반쪽', origin: 'Gk. hemi' },
			{ part: '-plegia', meaning: 'paralysis', meaningKo: '마비', origin: 'Gk. plege' }
		],
		category: 'neurology'
	},
	{
		id: 'neuropathy',
		term: 'Neuropathy',
		korean: '신경병증',
		definition: 'Disease or dysfunction of one or more peripheral nerves, typically causing numbness or weakness.',
		definitionKo: '하나 이상의 말초신경 질환으로 주로 무감각 또는 허약함을 유발합니다.',
		etymology: [
			{ part: 'Neuro-', meaning: 'nerve', meaningKo: '신경', origin: 'Gk. neuron' },
			{ part: '-pathy', meaning: 'disease', meaningKo: '병증', origin: 'Gk. pathos' }
		],
		category: 'neurology'
	},
	{
		id: 'hydrocephalus',
		term: 'Hydrocephalus',
		korean: '수두증',
		definition: 'Accumulation of cerebrospinal fluid in the brain, causing increased pressure.',
		definitionKo: '뇌에 뇌척수액이 축적되어 압력이 증가하는 상태입니다.',
		etymology: [
			{ part: 'Hydro-', meaning: 'water', meaningKo: '물', origin: 'Gk. hydor' },
			{ part: '-cephalus', meaning: 'head', meaningKo: '머리', origin: 'Gk. kephale' }
		],
		category: 'neurology'
	},
	{
		id: 'polyneuropathy',
		term: 'Polyneuropathy',
		korean: '다발신경병증',
		definition: 'Simultaneous malfunction of many peripheral nerves throughout the body.',
		definitionKo: '전신의 여러 말초신경이 동시에 기능 이상을 보이는 상태입니다.',
		etymology: [
			{ part: 'Poly-', meaning: 'many', meaningKo: '다수', origin: 'Gk. polys' },
			{ part: '-neuro-', meaning: 'nerve', meaningKo: '신경', origin: 'Gk. neuron' },
			{ part: '-pathy', meaning: 'disease', meaningKo: '병증', origin: 'Gk. pathos' }
		],
		category: 'neurology'
	},

	// ── Pulmonology 호흡기학 ───────────────────────────────────────
	{
		id: 'pneumonia',
		term: 'Pneumonia',
		korean: '폐렴',
		definition: 'Infection that inflames air sacs in one or both lungs, which may fill with fluid.',
		definitionKo: '한쪽 또는 양쪽 폐의 공기 주머니에 염증이 생기고 액체가 차는 감염입니다.',
		etymology: [
			{ part: 'Pneumo-', meaning: 'lung/air', meaningKo: '폐/공기', origin: 'Gk. pneumon' },
			{ part: '-ia', meaning: 'condition', meaningKo: '~증/상태', origin: 'Gk. -ia' }
		],
		category: 'pulmonology'
	},
	{
		id: 'bronchitis',
		term: 'Bronchitis',
		korean: '기관지염',
		definition: 'Inflammation of the lining of bronchial tubes, which carry air to and from the lungs.',
		definitionKo: '폐로 공기를 전달하는 기관지 내벽의 염증입니다.',
		etymology: [
			{ part: 'Broncho-', meaning: 'bronchus/airway', meaningKo: '기관지', origin: 'Gk. bronchos' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'pulmonology'
	},
	{
		id: 'pneumothorax',
		term: 'Pneumothorax',
		korean: '기흉',
		definition: 'Collapsed lung caused by air leaking into the space between the lung and chest wall.',
		definitionKo: '폐와 흉벽 사이 공간으로 공기가 새어 폐가 허탈되는 상태입니다.',
		etymology: [
			{ part: 'Pneumo-', meaning: 'air', meaningKo: '공기', origin: 'Gk. pneuma' },
			{ part: '-thorax', meaning: 'chest', meaningKo: '흉곽', origin: 'Gk. thorax' }
		],
		category: 'pulmonology'
	},
	{
		id: 'pleuritis',
		term: 'Pleuritis',
		korean: '흉막염',
		definition: 'Inflammation of the pleura, the two-layered membrane surrounding the lungs.',
		definitionKo: '폐를 둘러싸는 이중막인 흉막의 염증입니다.',
		etymology: [
			{ part: 'Pleuro-', meaning: 'pleura/rib', meaningKo: '흉막/갈비', origin: 'Gk. pleura' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'pulmonology'
	},
	{
		id: 'hemoptysis',
		term: 'Hemoptysis',
		korean: '객혈',
		definition: 'Coughing up blood from the respiratory tract, often a sign of serious lung disease.',
		definitionKo: '호흡기로부터 혈액을 기침으로 뱉는 증상으로 심각한 폐 질환의 징후입니다.',
		etymology: [
			{ part: 'Hemo-', meaning: 'blood', meaningKo: '혈액', origin: 'Gk. haima' },
			{ part: '-ptysis', meaning: 'spitting', meaningKo: '뱉기', origin: 'Gk. ptyein' }
		],
		category: 'pulmonology'
	},
	{
		id: 'atelectasis',
		term: 'Atelectasis',
		korean: '무기폐',
		definition: 'Complete or partial collapse of a lung or lobe of a lung.',
		definitionKo: '폐 또는 폐엽의 완전하거나 부분적인 허탈입니다.',
		etymology: [
			{ part: 'Ateles-', meaning: 'incomplete', meaningKo: '불완전한', origin: 'Gk. ateles' },
			{ part: '-ektasis', meaning: 'expansion', meaningKo: '팽창', origin: 'Gk. ektasis' }
		],
		category: 'pulmonology'
	},

	// ── Gastroenterology 소화기학 ──────────────────────────────────
	{
		id: 'gastritis',
		term: 'Gastritis',
		korean: '위염',
		definition: 'Inflammation of the stomach lining, causing pain, nausea, and sometimes bleeding.',
		definitionKo: '위 내벽의 염증으로 통증, 구역질, 때로는 출혈을 유발합니다.',
		etymology: [
			{ part: 'Gastro-', meaning: 'stomach', meaningKo: '위장', origin: 'Gk. gaster' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'gastroenterology'
	},
	{
		id: 'hepatitis',
		term: 'Hepatitis',
		korean: '간염',
		definition: 'Inflammation of the liver, often caused by viral infection, alcohol, or toxins.',
		definitionKo: '주로 바이러스 감염, 알코올, 독소에 의한 간의 염증입니다.',
		etymology: [
			{ part: 'Hepato-', meaning: 'liver', meaningKo: '간', origin: 'Gk. hepar' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'gastroenterology'
	},
	{
		id: 'cholecystitis',
		term: 'Cholecystitis',
		korean: '담낭염',
		definition: 'Inflammation of the gallbladder, often caused by gallstones blocking bile flow.',
		definitionKo: '담석이 담즙 흐름을 막아 발생하는 담낭의 염증입니다.',
		etymology: [
			{ part: 'Chole-', meaning: 'bile', meaningKo: '담즙', origin: 'Gk. chole' },
			{ part: '-cysto-', meaning: 'bladder/sac', meaningKo: '방광/낭', origin: 'Gk. kystis' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'gastroenterology'
	},
	{
		id: 'appendicitis',
		term: 'Appendicitis',
		korean: '충수염',
		definition: 'Inflammation of the appendix, a small pouch attached to the large intestine.',
		definitionKo: '대장에 붙어 있는 작은 주머니인 충수의 염증입니다.',
		etymology: [
			{ part: 'Appendico-', meaning: 'appendix', meaningKo: '충수', origin: 'L. appendix' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'gastroenterology'
	},
	{
		id: 'pancreatitis',
		term: 'Pancreatitis',
		korean: '췌장염',
		definition: 'Inflammation of the pancreas that can occur as acute flares or chronic condition.',
		definitionKo: '급성 또는 만성으로 나타날 수 있는 췌장의 염증입니다.',
		etymology: [
			{ part: 'Pancreato-', meaning: 'pancreas', meaningKo: '췌장', origin: 'Gk. pankreas' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'gastroenterology'
	},
	{
		id: 'dysphagia',
		term: 'Dysphagia',
		korean: '연하곤란',
		definition: 'Difficulty swallowing, which may indicate disease of the esophagus or pharynx.',
		definitionKo: '삼키기 어려운 증상으로 식도나 인두 질환을 시사할 수 있습니다.',
		etymology: [
			{ part: 'Dys-', meaning: 'difficult/abnormal', meaningKo: '어려운/이상', origin: 'Gk. dys' },
			{ part: '-phagia', meaning: 'eating/swallowing', meaningKo: '삼킴/섭식', origin: 'Gk. phagein' }
		],
		category: 'gastroenterology'
	},

	// ── Nephrology 신장학 ──────────────────────────────────────────
	{
		id: 'nephritis',
		term: 'Nephritis',
		korean: '신장염',
		definition: 'Inflammation of the kidneys, often affecting their ability to filter waste from blood.',
		definitionKo: '혈액에서 노폐물을 걸러내는 기능에 영향을 주는 신장 염증입니다.',
		etymology: [
			{ part: 'Nephro-', meaning: 'kidney', meaningKo: '신장', origin: 'Gk. nephros' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'nephrology'
	},
	{
		id: 'nephrolithiasis',
		term: 'Nephrolithiasis',
		korean: '신장결석증',
		definition: 'Formation of kidney stones (calculi) within the urinary collecting system.',
		definitionKo: '요로계 내에 신장결석(결석)이 형성되는 질환입니다.',
		etymology: [
			{ part: 'Nephro-', meaning: 'kidney', meaningKo: '신장', origin: 'Gk. nephros' },
			{ part: '-litho-', meaning: 'stone', meaningKo: '돌/결석', origin: 'Gk. lithos' },
			{ part: '-iasis', meaning: 'condition/formation', meaningKo: '상태/형성', origin: 'Gk. -iasis' }
		],
		category: 'nephrology'
	},
	{
		id: 'glomerulonephritis',
		term: 'Glomerulonephritis',
		korean: '사구체신염',
		definition: 'Inflammation of the tiny filters (glomeruli) in the kidneys.',
		definitionKo: '신장 내 작은 여과 장치인 사구체의 염증입니다.',
		etymology: [
			{ part: 'Glomerulo-', meaning: 'glomerulus/little ball', meaningKo: '사구체', origin: 'L. glomerulus' },
			{ part: '-nephro-', meaning: 'kidney', meaningKo: '신장', origin: 'Gk. nephros' },
			{ part: '-itis', meaning: 'inflammation', meaningKo: '염증', origin: 'Gk. -itis' }
		],
		category: 'nephrology'
	},
	{
		id: 'oliguria',
		term: 'Oliguria',
		korean: '핍뇨',
		definition: 'Decreased urine output, less than 400 mL per day, often indicating renal failure.',
		definitionKo: '하루 400mL 미만의 소변 감소 상태로 신부전을 시사합니다.',
		etymology: [
			{ part: 'Oligo-', meaning: 'little/few', meaningKo: '적은', origin: 'Gk. oligos' },
			{ part: '-uria', meaning: 'urine condition', meaningKo: '뇨 상태', origin: 'Gk. ouron' }
		],
		category: 'nephrology'
	},
	{
		id: 'hematuria',
		term: 'Hematuria',
		korean: '혈뇨',
		definition: 'Presence of blood in urine, which may be a sign of kidney disease or urinary tract infection.',
		definitionKo: '소변 내 혈액이 존재하는 것으로 신장 질환이나 요로 감염의 징후입니다.',
		etymology: [
			{ part: 'Hemato-', meaning: 'blood', meaningKo: '혈액', origin: 'Gk. haima' },
			{ part: '-uria', meaning: 'urine condition', meaningKo: '뇨 상태', origin: 'Gk. ouron' }
		],
		category: 'nephrology'
	},
	{
		id: 'proteinuria',
		term: 'Proteinuria',
		korean: '단백뇨',
		definition: 'Excess protein in the urine, indicating possible kidney disease or damage.',
		definitionKo: '소변 내 단백질 과잉으로 신장 질환이나 손상을 시사합니다.',
		etymology: [
			{ part: 'Protein-', meaning: 'protein', meaningKo: '단백질', origin: 'Gk. proteios' },
			{ part: '-uria', meaning: 'urine condition', meaningKo: '뇨 상태', origin: 'Gk. ouron' }
		],
		category: 'nephrology'
	},

	// ── Hematology 혈액학 ──────────────────────────────────────────
	{
		id: 'anemia',
		term: 'Anemia',
		korean: '빈혈',
		definition: 'A condition where the blood lacks enough healthy red blood cells to carry adequate oxygen.',
		definitionKo: '혈액에 산소를 충분히 운반할 건강한 적혈구가 부족한 상태입니다.',
		etymology: [
			{ part: 'An-', meaning: 'without', meaningKo: '~없는', origin: 'Gk. an-' },
			{ part: '-emia', meaning: 'blood condition', meaningKo: '혈액 상태', origin: 'Gk. haima' }
		],
		category: 'hematology'
	},
	{
		id: 'leukemia',
		term: 'Leukemia',
		korean: '백혈병',
		definition: 'Cancer of blood-forming tissues in which abnormal white blood cells are produced in large numbers.',
		definitionKo: '비정상적인 백혈구가 대량 생성되는 조혈 조직의 암입니다.',
		etymology: [
			{ part: 'Leuko-', meaning: 'white', meaningKo: '흰색', origin: 'Gk. leukos' },
			{ part: '-emia', meaning: 'blood condition', meaningKo: '혈액 상태', origin: 'Gk. haima' }
		],
		category: 'hematology'
	},
	{
		id: 'thrombocytopenia',
		term: 'Thrombocytopenia',
		korean: '혈소판감소증',
		definition: 'Low platelet count in the blood, leading to increased risk of bleeding.',
		definitionKo: '혈액 내 혈소판 수 감소로 출혈 위험이 증가합니다.',
		etymology: [
			{ part: 'Thrombo-', meaning: 'clot/platelet', meaningKo: '혈전/혈소판', origin: 'Gk. thrombos' },
			{ part: '-cyto-', meaning: 'cell', meaningKo: '세포', origin: 'Gk. kytos' },
			{ part: '-penia', meaning: 'deficiency', meaningKo: '결핍/감소증', origin: 'Gk. penia' }
		],
		category: 'hematology'
	},
	{
		id: 'polycythemia',
		term: 'Polycythemia',
		korean: '적혈구증가증',
		definition: 'An abnormally high concentration of red blood cells in the bloodstream.',
		definitionKo: '혈류 내 적혈구 농도가 비정상적으로 높은 상태입니다.',
		etymology: [
			{ part: 'Poly-', meaning: 'many', meaningKo: '많은', origin: 'Gk. polys' },
			{ part: '-cyto-', meaning: 'cell', meaningKo: '세포', origin: 'Gk. kytos' },
			{ part: '-hemia', meaning: 'blood condition', meaningKo: '혈액 상태', origin: 'Gk. haima' }
		],
		category: 'hematology'
	},
	{
		id: 'hemophilia',
		term: 'Hemophilia',
		korean: '혈우병',
		definition: 'A genetic disorder in which blood does not clot normally due to lack of clotting factors.',
		definitionKo: '응고인자 부족으로 혈액이 정상적으로 응고되지 않는 유전 질환입니다.',
		etymology: [
			{ part: 'Hemo-', meaning: 'blood', meaningKo: '혈액', origin: 'Gk. haima' },
			{ part: '-philia', meaning: 'love/affinity', meaningKo: '친화성', origin: 'Gk. philos' }
		],
		category: 'hematology'
	},

	// ── Pathology 병리학 ───────────────────────────────────────────
	{
		id: 'necrosis',
		term: 'Necrosis',
		korean: '괴사',
		definition: 'Death of body tissue due to lack of blood supply, injury, or disease.',
		definitionKo: '혈액 공급 부족, 손상, 또는 질환으로 인한 신체 조직의 사망입니다.',
		etymology: [
			{ part: 'Necro-', meaning: 'death', meaningKo: '죽음/사망', origin: 'Gk. nekros' },
			{ part: '-osis', meaning: 'condition/process', meaningKo: '상태/과정', origin: 'Gk. -osis' }
		],
		category: 'pathology'
	},
	{
		id: 'fibrosis',
		term: 'Fibrosis',
		korean: '섬유증',
		definition: 'Formation of excess fibrous connective tissue in an organ or tissue, often as a repair process.',
		definitionKo: '기관이나 조직에서 주로 복구 과정으로 과도한 섬유성 결합 조직이 형성되는 것입니다.',
		etymology: [
			{ part: 'Fibro-', meaning: 'fiber', meaningKo: '섬유', origin: 'L. fibra' },
			{ part: '-osis', meaning: 'abnormal condition', meaningKo: '비정상적 상태', origin: 'Gk. -osis' }
		],
		category: 'pathology'
	},
	{
		id: 'hyperplasia',
		term: 'Hyperplasia',
		korean: '증식증',
		definition: 'Increase in the number of cells in an organ or tissue, causing it to enlarge.',
		definitionKo: '기관이나 조직의 세포 수가 증가하여 비대해지는 상태입니다.',
		etymology: [
			{ part: 'Hyper-', meaning: 'excessive/above', meaningKo: '과도한/초과', origin: 'Gk. hyper' },
			{ part: '-plasia', meaning: 'formation/growth', meaningKo: '형성/성장', origin: 'Gk. plasis' }
		],
		category: 'pathology'
	},
	{
		id: 'metaplasia',
		term: 'Metaplasia',
		korean: '화생',
		definition: 'Reversible replacement of one type of differentiated cell by another mature cell type.',
		definitionKo: '한 종류의 분화된 세포가 다른 성숙 세포 유형으로 가역적으로 대체되는 것입니다.',
		etymology: [
			{ part: 'Meta-', meaning: 'change/after', meaningKo: '변화/이후', origin: 'Gk. meta' },
			{ part: '-plasia', meaning: 'formation', meaningKo: '형성', origin: 'Gk. plasis' }
		],
		category: 'pathology'
	},
	{
		id: 'dysplasia',
		term: 'Dysplasia',
		korean: '이형성증',
		definition: 'Abnormal development of cells, tissues, or organs, often a precancerous change.',
		definitionKo: '세포, 조직, 기관의 비정상적 발달로 종종 전암성 변화입니다.',
		etymology: [
			{ part: 'Dys-', meaning: 'abnormal/bad', meaningKo: '비정상/이상', origin: 'Gk. dys' },
			{ part: '-plasia', meaning: 'formation/growth', meaningKo: '형성/성장', origin: 'Gk. plasis' }
		],
		category: 'pathology'
	},
	{
		id: 'edema',
		term: 'Edema',
		korean: '부종',
		definition: 'Swelling caused by excess fluid trapped in body tissues.',
		definitionKo: '신체 조직에 갇힌 과잉 체액으로 인한 부기입니다.',
		etymology: [
			{ part: 'Edema', meaning: 'swelling', meaningKo: '부기', origin: 'Gk. oidema' }
		],
		category: 'pathology'
	},
	{
		id: 'ischemia',
		term: 'Ischemia',
		korean: '허혈',
		definition: 'Inadequate blood supply to a part of the body, especially the heart muscles.',
		definitionKo: '신체 일부, 특히 심근에 혈액 공급이 불충분한 상태입니다.',
		etymology: [
			{ part: 'Ischo-', meaning: 'to hold back', meaningKo: '억제/억류', origin: 'Gk. ischein' },
			{ part: '-emia', meaning: 'blood condition', meaningKo: '혈액 상태', origin: 'Gk. haima' }
		],
		category: 'pathology'
	},

	// ── Anatomy 해부학 ─────────────────────────────────────────────
	{
		id: 'subcutaneous',
		term: 'Subcutaneous',
		korean: '피하',
		definition: 'Situated or applied under the skin.',
		definitionKo: '피부 아래에 위치하거나 적용되는 것을 나타냅니다.',
		etymology: [
			{ part: 'Sub-', meaning: 'under/below', meaningKo: '아래', origin: 'L. sub' },
			{ part: '-cutane-', meaning: 'skin', meaningKo: '피부', origin: 'L. cutis' },
			{ part: '-ous', meaning: 'pertaining to', meaningKo: '~의/~에 관한', origin: 'L. -osus' }
		],
		category: 'anatomy'
	},
	{
		id: 'intramuscular',
		term: 'Intramuscular',
		korean: '근육 내',
		definition: 'Within or into a muscle; commonly refers to injections delivered into muscle tissue.',
		definitionKo: '근육 내 또는 근육으로; 근육 조직에 주사하는 것을 흔히 지칭합니다.',
		etymology: [
			{ part: 'Intra-', meaning: 'within', meaningKo: '내부', origin: 'L. intra' },
			{ part: '-muscular', meaning: 'muscle', meaningKo: '근육', origin: 'L. musculus' }
		],
		category: 'anatomy'
	},
	{
		id: 'periosteum',
		term: 'Periosteum',
		korean: '골막',
		definition: 'The dense fibrous membrane covering the surface of bones, except at joints.',
		definitionKo: '관절을 제외한 뼈의 표면을 덮는 치밀한 섬유성 막입니다.',
		etymology: [
			{ part: 'Peri-', meaning: 'around', meaningKo: '주위', origin: 'Gk. peri' },
			{ part: '-osteum', meaning: 'bone', meaningKo: '뼈', origin: 'Gk. osteon' }
		],
		category: 'anatomy'
	},
	{
		id: 'intravenous',
		term: 'Intravenous',
		korean: '정맥 내',
		definition: 'Existing or occurring within, or administered through a vein.',
		definitionKo: '정맥 내에 존재하거나 정맥을 통해 투여되는 것입니다.',
		etymology: [
			{ part: 'Intra-', meaning: 'within', meaningKo: '내부', origin: 'L. intra' },
			{ part: '-venous', meaning: 'vein', meaningKo: '정맥', origin: 'L. vena' }
		],
		category: 'anatomy'
	},
	{
		id: 'bilateral',
		term: 'Bilateral',
		korean: '양측성',
		definition: 'Affecting or occurring on both sides of the body or of a structure.',
		definitionKo: '신체나 구조물의 양쪽 측면에 영향을 미치거나 나타나는 것입니다.',
		etymology: [
			{ part: 'Bi-', meaning: 'two', meaningKo: '둘', origin: 'L. bi' },
			{ part: '-lateral', meaning: 'side', meaningKo: '측면', origin: 'L. latus' }
		],
		category: 'anatomy'
	}
];
