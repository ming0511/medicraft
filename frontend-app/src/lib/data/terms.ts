// 의학용어 = 어근(morphemes.ts)의 조합. `parts`(morpheme id 순서 배열)가 핵심.
// `term`은 대부분 parts + 조합 규칙으로 유도 가능하지만 불규칙 표기 대비 명시 저장.
// ⚠️ 전환기: 옛 화면들이 쓰는 `etymology`(EtymologyPart[])·`category`는 morpheme에서 파생한 호환 필드.
//    화면을 morpheme 기준으로 옮기면서 제거할 예정. 자세한 건 루트 CLAUDE.md "현재 구현 상태" 참고.

import { morphemeById, type Morpheme } from './morphemes';
import { isFromActiveLecture } from '$lib/stores/lecture-prefs.svelte';

/** body system 태그(학습 순서 아님, 필터용). 기존 category 값을 그대로 유지. */
export const CATEGORIES: Record<string, string> = {
	cardiology: '심장학',
	neurology: '신경학',
	pulmonology: '호흡기학',
	gastroenterology: '소화기학',
	nephrology: '신장학',
	hematology: '혈액학',
	pathology: '병리학',
	musculoskeletal: '근골격계',
	anatomy: '해부학',
	endocrinology: '내분비학',
	gynecology: '부인과학',
	obstetrics: '산과학',
	andrology: '남성의학',
	ophthalmology: '안과학',
	otology: '이과학',
	dermatology: '피부과학'
};
/** @deprecated CATEGORIES 와 동일 — 의미상 "system 태그"임을 분명히 하려는 별칭. */
export const SYSTEMS = CATEGORIES;

export interface Term {
	id: string;
	/** ★ morpheme id를 표면 순서대로. 예: ['cardi','my','pathy'] */
	parts: string[];
	/** 표시용 영문 용어 (불규칙 표기 대비 명시 저장). */
	term: string;
	korean: string;
	definitionKo: string;
	definition?: string;
	/** body system 태그 (CATEGORIES 키). 첫 번째가 대표. */
	systems: string[];
	/** 강의자료 수확으로 들어온 경우, 어느 lecture(s) 에서 합류했는지. 비어있음 = 큐레이션 원본. */
	fromLectures?: string[];
}

/** @deprecated 옛 화면 호환용 — morpheme 한 조각의 평면 표현. */
export interface EtymologyPart {
	part: string;
	meaning: string;
	meaningKo: string;
	origin: string;
}

/** @deprecated 옛 화면 호환 타입. 새 코드는 `Term` + `partsToMorphemes` 사용. */
export type MedicalTerm = Term & {
	/** systems[0] */
	category: string;
	/** morpheme에서 파생한 어원 조각 배열. */
	etymology: EtymologyPart[];
	/** parts를 채운 Morpheme 배열. */
	morphemes: Morpheme[];
};

function toEtymologyPart(m: Morpheme): EtymologyPart {
	return { part: m.form, meaning: m.meaning, meaningKo: m.meaningKo, origin: m.origin };
}

const rawTerms: Term[] = [
	// ── Cardiology 심장학 ──────────────────────────────────────────
	{ id: 'cardiomyopathy', parts: ['cardi', 'my', 'pathy'], term: 'Cardiomyopathy', korean: '심근병증', systems: ['cardiology'], definition: 'A disease of the heart muscle that makes it harder for your heart to pump blood to the rest of your body.', definitionKo: '심장 근육의 질환으로, 심장이 온몸으로 혈액을 펌프질하는 것을 어렵게 만듭니다.' },
	{ id: 'tachycardia', parts: ['tachy', 'cardi', 'ia'], term: 'Tachycardia', korean: '빈맥', systems: ['cardiology'], definition: 'An abnormally fast heart rate, typically over 100 beats per minute at rest.', definitionKo: '안정 시 분당 100회 이상의 비정상적으로 빠른 심박수입니다.' },
	{ id: 'bradycardia', parts: ['brady', 'cardi', 'ia'], term: 'Bradycardia', korean: '서맥', systems: ['cardiology'], definition: 'An abnormally slow heart rate, typically fewer than 60 beats per minute at rest.', definitionKo: '안정 시 분당 60회 미만의 비정상적으로 느린 심박수입니다.' },
	{ id: 'atherosclerosis', parts: ['ather', 'scler', 'osis'], term: 'Atherosclerosis', korean: '죽상동맥경화증', systems: ['cardiology'], definition: 'Hardening and narrowing of arteries due to plaque buildup on their inner walls.', definitionKo: '동맥 내벽에 플라크가 쌓여 동맥이 굳고 좁아지는 질환입니다.' },
	{ id: 'myocardial-infarction', parts: ['my', 'cardi', 'al', 'infarction'], term: 'Myocardial Infarction', korean: '심근경색', systems: ['cardiology'], definition: 'Death of heart muscle tissue due to blockage of a coronary artery, commonly called a heart attack.', definitionKo: '관상동맥 폐색으로 인한 심근 조직의 괴사이며, 흔히 심장마비라고 합니다.' },
	{ id: 'pericarditis', parts: ['peri', 'cardi', 'itis'], term: 'Pericarditis', korean: '심낭염', systems: ['cardiology'], definition: 'Inflammation of the pericardium, the thin sac-like membrane surrounding the heart.', definitionKo: '심장을 둘러싸는 얇은 주머니 모양의 막인 심낭의 염증입니다.' },
	{ id: 'arrhythmia', parts: ['a', 'rhythm', 'ia'], term: 'Arrhythmia', korean: '부정맥', systems: ['cardiology'], definition: 'An irregular heartbeat; the heart may beat too fast, too slow, or with an irregular pattern.', definitionKo: '불규칙한 심장 박동으로, 너무 빠르거나 느리거나 불규칙한 패턴으로 뛸 수 있습니다.' },
	{ id: 'endocarditis', parts: ['endo', 'cardi', 'itis'], term: 'Endocarditis', korean: '심내막염', systems: ['cardiology'], definition: 'Infection and inflammation of the inner lining of the heart chambers and valves.', definitionKo: '심장 내부 및 판막의 내벽 감염 및 염증입니다.' },
	{ id: 'cardiomegaly', parts: ['cardi', 'megaly'], term: 'Cardiomegaly', korean: '심장비대', systems: ['cardiology'], definition: 'An enlarged heart, often a sign of underlying disease such as hypertension or cardiomyopathy.', definitionKo: '심장이 비정상적으로 커진 상태로, 고혈압이나 심근병증 등의 기저 질환을 시사합니다.' },
	{ id: 'cardiology-study', parts: ['cardi', 'logy'], term: 'Cardiology', korean: '심장학', systems: ['cardiology'], definition: 'The branch of medicine that deals with disorders of the heart and the cardiovascular system.', definitionKo: '심장과 심혈관계 질환을 다루는 의학 분야입니다.' },
	{ id: 'angiography', parts: ['angi', 'graphy'], term: 'Angiography', korean: '혈관조영술', systems: ['cardiology'], definition: 'Imaging technique used to visualize the inside of blood vessels using contrast dye and X-rays.', definitionKo: '조영제와 X선을 이용해 혈관 내부를 영상화하는 검사법입니다.' },
	{ id: 'carditis', parts: ['cardi', 'itis'], term: 'Carditis', korean: '심장염', systems: ['cardiology'], definition: 'Inflammation of the heart.', definitionKo: '심장(심장벽 전체)의 염증입니다.' },
	{ id: 'myocarditis', parts: ['my', 'cardi', 'itis'], term: 'Myocarditis', korean: '심근염', systems: ['cardiology'], definition: 'Inflammation of the heart muscle (myocardium).', definitionKo: '심장 근육층(심근)의 염증입니다.' },
	{ id: 'myocardium', parts: ['my', 'cardi', 'um'], term: 'Myocardium', korean: '심근', systems: ['cardiology'], definition: 'The thick muscular middle layer of the heart wall that contracts to pump blood.', definitionKo: '혈액을 짜내기 위해 수축하는 심장벽의 두꺼운 근육층입니다.' },
	{ id: 'pericardium', parts: ['peri', 'cardi', 'um'], term: 'Pericardium', korean: '심막', systems: ['cardiology'], definition: 'The double-walled sac that surrounds and protects the heart.', definitionKo: '심장을 둘러싸 보호하는 이중벽 주머니막입니다.' },
	{ id: 'endocardium', parts: ['endo', 'cardi', 'um'], term: 'Endocardium', korean: '심내막', systems: ['cardiology'], definition: 'The smooth inner lining of the heart chambers and valves.', definitionKo: '심장 내강과 판막을 덮는 매끈한 내벽입니다.' },
	{ id: 'cardiopathy', parts: ['cardi', 'pathy'], term: 'Cardiopathy', korean: '심장병증', systems: ['cardiology'], definition: 'A general term for any disease or disorder of the heart.', definitionKo: '심장의 질환을 통칭하는 말입니다.' },
	{ id: 'angiitis', parts: ['angi', 'itis'], term: 'Angiitis', korean: '혈관염', systems: ['cardiology'], definition: 'Inflammation of the wall of a blood or lymph vessel.', definitionKo: '혈관(또는 림프관) 벽의 염증입니다.' },
	{ id: 'hemangioma', parts: ['hemo', 'angi', 'oma'], term: 'Hemangioma', korean: '혈관종', systems: ['cardiology'], definition: 'A benign tumor formed by an abnormal buildup of blood vessels.', definitionKo: '혈관이 비정상적으로 증식해 생기는 양성 종양입니다.' },
	{ id: 'thrombosis', parts: ['thromb', 'osis'], term: 'Thrombosis', korean: '혈전증', systems: ['cardiology'], definition: 'Formation of a blood clot inside a vessel, obstructing blood flow.', definitionKo: '혈관 안에 혈전이 생겨 혈류를 막는 상태입니다.' },
	{ id: 'thrombectomy', parts: ['thromb', 'ectomy'], term: 'Thrombectomy', korean: '혈전제거술', systems: ['cardiology'], definition: 'Surgical removal of a blood clot from a vessel.', definitionKo: '혈관에서 혈전을 외과적으로 제거하는 수술입니다.' },
	{ id: 'atheroma', parts: ['ather', 'oma'], term: 'Atheroma', korean: '죽종', systems: ['cardiology'], definition: 'A fatty plaque deposit on the inner wall of an artery.', definitionKo: '동맥 내벽에 지방이 쌓여 생긴 죽상 플라크입니다.' },
	{ id: 'atherectomy', parts: ['ather', 'ectomy'], term: 'Atherectomy', korean: '죽종절제술', systems: ['cardiology'], definition: 'A procedure that removes atheromatous plaque from an artery.', definitionKo: '동맥에서 죽상 플라크를 제거하는 시술입니다.' },
	{ id: 'venography', parts: ['ven', 'graphy'], term: 'Venography', korean: '정맥조영술', systems: ['cardiology'], definition: 'X-ray imaging of veins using a contrast dye.', definitionKo: '조영제를 이용해 정맥을 X선으로 촬영하는 검사법입니다.' },
	{ id: 'venogram', parts: ['ven', 'gram'], term: 'Venogram', korean: '정맥조영상', systems: ['cardiology'], definition: 'The X-ray image produced by venography.', definitionKo: '정맥조영술로 얻은 X선 영상입니다.' },
	{ id: 'arteriosclerosis', parts: ['arteri', 'scler', 'osis'], term: 'Arteriosclerosis', korean: '동맥경화증', systems: ['cardiology'], definition: 'Thickening and hardening of the arterial walls, reducing their elasticity.', definitionKo: '동맥벽이 두꺼워지고 굳어 탄력을 잃는 질환입니다.' },
	{ id: 'arteritis', parts: ['arteri', 'itis'], term: 'Arteritis', korean: '동맥염', systems: ['cardiology'], definition: 'Inflammation of the wall of an artery.', definitionKo: '동맥 벽의 염증입니다.' },
	{ id: 'arteriography', parts: ['arteri', 'graphy'], term: 'Arteriography', korean: '동맥조영술', systems: ['cardiology'], definition: 'X-ray imaging of arteries using a contrast dye.', definitionKo: '조영제를 이용해 동맥을 X선으로 촬영하는 검사법입니다.' },
	{ id: 'phlebitis', parts: ['phleb', 'itis'], term: 'Phlebitis', korean: '정맥염', systems: ['cardiology'], definition: 'Inflammation of a vein, most often in the legs.', definitionKo: '정맥 벽의 염증으로 주로 다리에 생깁니다.' },
	{ id: 'phlebotomy', parts: ['phleb', 'otomy'], term: 'Phlebotomy', korean: '정맥절개(채혈)', systems: ['cardiology'], definition: 'Incision into a vein to draw blood.', definitionKo: '혈액을 뽑기 위해 정맥을 절개하는 것입니다.' },
	{ id: 'electrocardiogram', parts: ['electr', 'cardi', 'gram'], term: 'Electrocardiogram', korean: '심전도', systems: ['cardiology'], definition: "A recording of the heart's electrical activity (ECG/EKG).", definitionKo: '심장의 전기 활동을 기록한 그래프(ECG)입니다.' },
	{ id: 'electrocardiography', parts: ['electr', 'cardi', 'graphy'], term: 'Electrocardiography', korean: '심전도검사', systems: ['cardiology'], definition: "The technique of recording the heart's electrical activity.", definitionKo: '심장의 전기 활동을 기록하는 검사법입니다.' },

	// ── Neurology 신경학 ───────────────────────────────────────────
	{ id: 'encephalitis', parts: ['encephal', 'itis'], term: 'Encephalitis', korean: '뇌염', systems: ['neurology'], definition: 'Inflammation of the brain, usually caused by a viral infection.', definitionKo: '주로 바이러스 감염으로 인한 뇌의 염증입니다.' },
	{ id: 'meningitis', parts: ['mening', 'itis'], term: 'Meningitis', korean: '수막염', systems: ['neurology'], definition: 'Inflammation of the meninges, the protective membranes covering the brain and spinal cord.', definitionKo: '뇌와 척수를 덮는 보호막인 수막의 염증입니다.' },
	{ id: 'neuralgia', parts: ['neur', 'algia'], term: 'Neuralgia', korean: '신경통', systems: ['neurology'], definition: 'Intense, typically intermittent pain along the course of a nerve.', definitionKo: '신경 경로를 따라 나타나는 강렬하고 주로 간헐적인 통증입니다.' },
	{ id: 'hemiplegia', parts: ['hemi', 'plegia'], term: 'Hemiplegia', korean: '편마비', systems: ['neurology'], definition: 'Paralysis of one side of the body, typically caused by stroke or brain injury.', definitionKo: '주로 뇌졸중이나 뇌 손상으로 인한 신체 한쪽의 마비입니다.' },
	{ id: 'neuropathy', parts: ['neur', 'pathy'], term: 'Neuropathy', korean: '신경병증', systems: ['neurology'], definition: 'Disease or dysfunction of one or more peripheral nerves, typically causing numbness or weakness.', definitionKo: '하나 이상의 말초신경 질환으로 주로 무감각 또는 허약함을 유발합니다.' },
	{ id: 'hydrocephalus', parts: ['hydr', 'cephal', 'us'], term: 'Hydrocephalus', korean: '수두증', systems: ['neurology'], definition: 'Accumulation of cerebrospinal fluid in the brain, causing increased pressure.', definitionKo: '뇌에 뇌척수액이 축적되어 압력이 증가하는 상태입니다.' },
	{ id: 'polyneuropathy', parts: ['poly', 'neur', 'pathy'], term: 'Polyneuropathy', korean: '다발신경병증', systems: ['neurology'], definition: 'Simultaneous malfunction of many peripheral nerves throughout the body.', definitionKo: '전신의 여러 말초신경이 동시에 기능 이상을 보이는 상태입니다.' },

	// ── Pulmonology 호흡기학 ───────────────────────────────────────
	{ id: 'pneumonia', parts: ['pneumo', 'ia'], term: 'Pneumonia', korean: '폐렴', systems: ['pulmonology'], definition: 'Infection that inflames air sacs in one or both lungs, which may fill with fluid.', definitionKo: '한쪽 또는 양쪽 폐의 공기 주머니에 염증이 생기고 액체가 차는 감염입니다.' },
	{ id: 'bronchitis', parts: ['bronch', 'itis'], term: 'Bronchitis', korean: '기관지염', systems: ['pulmonology'], definition: 'Inflammation of the lining of bronchial tubes, which carry air to and from the lungs.', definitionKo: '폐로 공기를 전달하는 기관지 내벽의 염증입니다.' },
	{ id: 'pneumothorax', parts: ['pneumo', 'thorax'], term: 'Pneumothorax', korean: '기흉', systems: ['pulmonology'], definition: 'Collapsed lung caused by air leaking into the space between the lung and chest wall.', definitionKo: '폐와 흉벽 사이 공간으로 공기가 새어 폐가 허탈되는 상태입니다.' },
	{ id: 'pleuritis', parts: ['pleur', 'itis'], term: 'Pleuritis', korean: '흉막염', systems: ['pulmonology'], definition: 'Inflammation of the pleura, the two-layered membrane surrounding the lungs.', definitionKo: '폐를 둘러싸는 이중막인 흉막의 염증입니다.' },
	{ id: 'hemoptysis', parts: ['hemo', 'ptysis'], term: 'Hemoptysis', korean: '객혈', systems: ['pulmonology'], definition: 'Coughing up blood from the respiratory tract, often a sign of serious lung disease.', definitionKo: '호흡기로부터 혈액을 기침으로 뱉는 증상으로 심각한 폐 질환의 징후입니다.' },
	{ id: 'atelectasis', parts: ['atel', 'ectasis'], term: 'Atelectasis', korean: '무기폐', systems: ['pulmonology'], definition: 'Complete or partial collapse of a lung or lobe of a lung.', definitionKo: '폐 또는 폐엽의 완전하거나 부분적인 허탈입니다.' },
	{ id: 'dyspnea', parts: ['dys', 'pnea'], term: 'Dyspnea', korean: '호흡곤란', systems: ['pulmonology'], definition: 'Difficult or labored breathing, often experienced as a feeling of breathlessness.', definitionKo: '호흡이 어렵거나 힘들게 느껴지는 증상으로, 숨이 차는 느낌으로 나타납니다.' },

	// ── Gastroenterology 소화기학 ──────────────────────────────────
	{ id: 'gastritis', parts: ['gastr', 'itis'], term: 'Gastritis', korean: '위염', systems: ['gastroenterology'], definition: 'Inflammation of the stomach lining, causing pain, nausea, and sometimes bleeding.', definitionKo: '위 내벽의 염증으로 통증, 구역질, 때로는 출혈을 유발합니다.' },
	{ id: 'hepatitis', parts: ['hepat', 'itis'], term: 'Hepatitis', korean: '간염', systems: ['gastroenterology'], definition: 'Inflammation of the liver, often caused by viral infection, alcohol, or toxins.', definitionKo: '주로 바이러스 감염, 알코올, 독소에 의한 간의 염증입니다.' },
	{ id: 'cholecystitis', parts: ['chole', 'cyst', 'itis'], term: 'Cholecystitis', korean: '담낭염', systems: ['gastroenterology'], definition: 'Inflammation of the gallbladder, often caused by gallstones blocking bile flow.', definitionKo: '담석이 담즙 흐름을 막아 발생하는 담낭의 염증입니다.' },
	{ id: 'appendicitis', parts: ['appendic', 'itis'], term: 'Appendicitis', korean: '충수염', systems: ['gastroenterology'], definition: 'Inflammation of the appendix, a small pouch attached to the large intestine.', definitionKo: '대장에 붙어 있는 작은 주머니인 충수의 염증입니다.' },
	{ id: 'pancreatitis', parts: ['pancreat', 'itis'], term: 'Pancreatitis', korean: '췌장염', systems: ['gastroenterology'], definition: 'Inflammation of the pancreas that can occur as acute flares or chronic condition.', definitionKo: '급성 또는 만성으로 나타날 수 있는 췌장의 염증입니다.' },
	{ id: 'dysphagia', parts: ['dys', 'phagia'], term: 'Dysphagia', korean: '연하곤란', systems: ['gastroenterology'], definition: 'Difficulty swallowing, which may indicate disease of the esophagus or pharynx.', definitionKo: '삼키기 어려운 증상으로 식도나 인두 질환을 시사할 수 있습니다.' },
	{ id: 'appendectomy', parts: ['appendic', 'ectomy'], term: 'Appendectomy', korean: '충수절제술', systems: ['gastroenterology'], definition: 'Surgical removal of the appendix, most often performed to treat appendicitis.', definitionKo: '충수를 외과적으로 제거하는 수술로, 주로 충수염 치료에 시행합니다.' },
	{ id: 'hepatoma', parts: ['hepat', 'oma'], term: 'Hepatoma', korean: '간종양', systems: ['gastroenterology'], definition: 'A tumor of the liver, most commonly referring to hepatocellular carcinoma.', definitionKo: '간에 생기는 종양으로, 주로 간세포암종을 의미합니다.' },
	{ id: 'hepatomegaly', parts: ['hepat', 'megaly'], term: 'Hepatomegaly', korean: '간비대', systems: ['gastroenterology', 'cardiology'], definition: 'Enlargement of the liver, often a sign of underlying disease such as fatty liver, hepatitis, or right-sided heart failure.', definitionKo: '간이 비정상적으로 커진 상태로, 지방간, 간염, 우심부전 등의 기저 질환을 시사합니다.', fromLectures: ['cardiology-week-3'] },

	// ── Nephrology 신장학 ──────────────────────────────────────────
	{ id: 'nephritis', parts: ['nephr', 'itis'], term: 'Nephritis', korean: '신장염', systems: ['nephrology'], definition: 'Inflammation of the kidneys, often affecting their ability to filter waste from blood.', definitionKo: '혈액에서 노폐물을 걸러내는 기능에 영향을 주는 신장 염증입니다.' },
	{ id: 'nephrolithiasis', parts: ['nephr', 'lith', 'iasis'], term: 'Nephrolithiasis', korean: '신장결석증', systems: ['nephrology'], definition: 'Formation of kidney stones (calculi) within the urinary collecting system.', definitionKo: '요로계 내에 신장결석(결석)이 형성되는 질환입니다.' },
	{ id: 'glomerulonephritis', parts: ['glomerul', 'nephr', 'itis'], term: 'Glomerulonephritis', korean: '사구체신염', systems: ['nephrology'], definition: 'Inflammation of the tiny filters (glomeruli) in the kidneys.', definitionKo: '신장 내 작은 여과 장치인 사구체의 염증입니다.' },
	{ id: 'oliguria', parts: ['olig', 'uria'], term: 'Oliguria', korean: '핍뇨', systems: ['nephrology'], definition: 'Decreased urine output, less than 400 mL per day, often indicating renal failure.', definitionKo: '하루 400mL 미만의 소변 감소 상태로 신부전을 시사합니다.' },
	{ id: 'hematuria', parts: ['hemo', 'uria'], term: 'Hematuria', korean: '혈뇨', systems: ['nephrology'], definition: 'Presence of blood in urine, which may be a sign of kidney disease or urinary tract infection.', definitionKo: '소변 내 혈액이 존재하는 것으로 신장 질환이나 요로 감염의 징후입니다.' },
	{ id: 'proteinuria', parts: ['protein', 'uria'], term: 'Proteinuria', korean: '단백뇨', systems: ['nephrology'], definition: 'Excess protein in the urine, indicating possible kidney disease or damage.', definitionKo: '소변 내 단백질 과잉으로 신장 질환이나 손상을 시사합니다.' },

	// ── Hematology 혈액학 ──────────────────────────────────────────
	{ id: 'anemia', parts: ['a', 'emia'], term: 'Anemia', korean: '빈혈', systems: ['hematology'], definition: 'A condition where the blood lacks enough healthy red blood cells to carry adequate oxygen.', definitionKo: '혈액에 산소를 충분히 운반할 건강한 적혈구가 부족한 상태입니다.' },
	{ id: 'leukemia', parts: ['leuk', 'emia'], term: 'Leukemia', korean: '백혈병', systems: ['hematology'], definition: 'Cancer of blood-forming tissues in which abnormal white blood cells are produced in large numbers.', definitionKo: '비정상적인 백혈구가 대량 생성되는 조혈 조직의 암입니다.' },
	{ id: 'thrombocytopenia', parts: ['thromb', 'cyt', 'penia'], term: 'Thrombocytopenia', korean: '혈소판감소증', systems: ['hematology'], definition: 'Low platelet count in the blood, leading to increased risk of bleeding.', definitionKo: '혈액 내 혈소판 수 감소로 출혈 위험이 증가합니다.' },
	{ id: 'polycythemia', parts: ['poly', 'cyt', 'emia'], term: 'Polycythemia', korean: '적혈구증가증', systems: ['hematology'], definition: 'An abnormally high concentration of red blood cells in the bloodstream.', definitionKo: '혈류 내 적혈구 농도가 비정상적으로 높은 상태입니다.' },
	{ id: 'hemophilia', parts: ['hemo', 'philia'], term: 'Hemophilia', korean: '혈우병', systems: ['hematology'], definition: 'A genetic disorder in which blood does not clot normally due to lack of clotting factors.', definitionKo: '응고인자 부족으로 혈액이 정상적으로 응고되지 않는 유전 질환입니다.' },

	// ── Pathology 병리학 ───────────────────────────────────────────
	{ id: 'necrosis', parts: ['necr', 'osis'], term: 'Necrosis', korean: '괴사', systems: ['pathology'], definition: 'Death of body tissue due to lack of blood supply, injury, or disease.', definitionKo: '혈액 공급 부족, 손상, 또는 질환으로 인한 신체 조직의 사망입니다.' },
	{ id: 'fibrosis', parts: ['fibr', 'osis'], term: 'Fibrosis', korean: '섬유증', systems: ['pathology'], definition: 'Formation of excess fibrous connective tissue in an organ or tissue, often as a repair process.', definitionKo: '기관이나 조직에서 주로 복구 과정으로 과도한 섬유성 결합 조직이 형성되는 것입니다.' },
	{ id: 'hyperplasia', parts: ['hyper', 'plasia'], term: 'Hyperplasia', korean: '증식증', systems: ['pathology'], definition: 'Increase in the number of cells in an organ or tissue, causing it to enlarge.', definitionKo: '기관이나 조직의 세포 수가 증가하여 비대해지는 상태입니다.' },
	{ id: 'metaplasia', parts: ['meta', 'plasia'], term: 'Metaplasia', korean: '화생', systems: ['pathology'], definition: 'Reversible replacement of one type of differentiated cell by another mature cell type.', definitionKo: '한 종류의 분화된 세포가 다른 성숙 세포 유형으로 가역적으로 대체되는 것입니다.' },
	{ id: 'dysplasia', parts: ['dys', 'plasia'], term: 'Dysplasia', korean: '이형성증', systems: ['pathology'], definition: 'Abnormal development of cells, tissues, or organs, often a precancerous change.', definitionKo: '세포, 조직, 기관의 비정상적 발달로 종종 전암성 변화입니다.' },
	{ id: 'edema', parts: ['edema'], term: 'Edema', korean: '부종', systems: ['pathology'], definition: 'Swelling caused by excess fluid trapped in body tissues.', definitionKo: '신체 조직에 갇힌 과잉 체액으로 인한 부기입니다.' },
	{ id: 'ischemia', parts: ['isch', 'emia'], term: 'Ischemia', korean: '허혈', systems: ['pathology'], definition: 'Inadequate blood supply to a part of the body, especially the heart muscles.', definitionKo: '신체 일부, 특히 심근에 혈액 공급이 불충분한 상태입니다.' },

	// ── Anatomy 해부학 ─────────────────────────────────────────────
	{ id: 'subcutaneous', parts: ['sub', 'cutane', 'ous'], term: 'Subcutaneous', korean: '피하', systems: ['anatomy'], definition: 'Situated or applied under the skin.', definitionKo: '피부 아래에 위치하거나 적용되는 것을 나타냅니다.' },
	{ id: 'intramuscular', parts: ['intra', 'muscul', 'ar'], term: 'Intramuscular', korean: '근육 내', systems: ['anatomy'], definition: 'Within or into a muscle; commonly refers to injections delivered into muscle tissue.', definitionKo: '근육 내 또는 근육으로; 근육 조직에 주사하는 것을 흔히 지칭합니다.' },
	{ id: 'periosteum', parts: ['peri', 'oste', 'um'], term: 'Periosteum', korean: '골막', systems: ['anatomy'], definition: 'The dense fibrous membrane covering the surface of bones, except at joints.', definitionKo: '관절을 제외한 뼈의 표면을 덮는 치밀한 섬유성 막입니다.' },
	{ id: 'intravenous', parts: ['intra', 'ven', 'ous'], term: 'Intravenous', korean: '정맥 내', systems: ['anatomy'], definition: 'Existing or occurring within, or administered through a vein.', definitionKo: '정맥 내에 존재하거나 정맥을 통해 투여되는 것입니다.' },
	{ id: 'bilateral', parts: ['bi', 'later', 'al'], term: 'Bilateral', korean: '양측성', systems: ['anatomy'], definition: 'Affecting or occurring on both sides of the body or of a structure.', definitionKo: '신체나 구조물의 양쪽 측면에 영향을 미치거나 나타나는 것입니다.' },

	// ══ 그물 밀도 보강 (기존 어근 재사용 위주) ══════════════════════
	// ── Neurology 신경학 ──
	{ id: 'neuritis', parts: ['neur', 'itis'], term: 'Neuritis', korean: '신경염', systems: ['neurology'], definition: 'Inflammation of a nerve.', definitionKo: '신경의 염증입니다.' },
	{ id: 'neuroma', parts: ['neur', 'oma'], term: 'Neuroma', korean: '신경종', systems: ['neurology'], definition: 'A benign tumor growing from nerve tissue.', definitionKo: '신경 조직에서 자라는 양성 종양입니다.' },
	{ id: 'encephalopathy', parts: ['encephal', 'pathy'], term: 'Encephalopathy', korean: '뇌병증', systems: ['neurology'], definition: 'Any diffuse disease or damage that alters brain function.', definitionKo: '뇌 기능을 광범위하게 떨어뜨리는 질환·손상을 통칭합니다.' },
	{ id: 'meningioma', parts: ['mening', 'oma'], term: 'Meningioma', korean: '수막종', systems: ['neurology'], definition: 'A usually benign tumor arising from the meninges.', definitionKo: '수막에서 생기는 대개 양성인 종양입니다.' },
	{ id: 'meningoencephalitis', parts: ['mening', 'encephal', 'itis'], term: 'Meningoencephalitis', korean: '수막뇌염', systems: ['neurology'], definition: 'Inflammation of both the meninges and the brain.', definitionKo: '수막과 뇌에 동시에 생긴 염증입니다.' },
	{ id: 'electroencephalogram', parts: ['electr', 'encephal', 'gram'], term: 'Electroencephalogram', korean: '뇌전도', systems: ['neurology'], definition: "A recording of the brain's electrical activity (EEG).", definitionKo: '뇌의 전기 활동을 기록한 그래프(EEG)입니다.' },
	{ id: 'electroencephalography', parts: ['electr', 'encephal', 'graphy'], term: 'Electroencephalography', korean: '뇌전도검사', systems: ['neurology'], definition: "The technique of recording the brain's electrical activity.", definitionKo: '뇌의 전기 활동을 기록하는 검사법입니다.' },
	{ id: 'cephalalgia', parts: ['cephal', 'algia'], term: 'Cephalalgia', korean: '두통', systems: ['neurology'], definition: 'Pain in the head; headache.', definitionKo: '머리의 통증, 즉 두통입니다.' },

	// ── Gastroenterology 소화기학 ──
	{ id: 'gastrectomy', parts: ['gastr', 'ectomy'], term: 'Gastrectomy', korean: '위절제술', systems: ['gastroenterology'], definition: 'Surgical removal of part or all of the stomach.', definitionKo: '위의 일부 또는 전부를 절제하는 수술입니다.' },
	{ id: 'gastropathy', parts: ['gastr', 'pathy'], term: 'Gastropathy', korean: '위병증', systems: ['gastroenterology'], definition: 'Any disease of the stomach.', definitionKo: '위의 질환을 통칭하는 말입니다.' },
	{ id: 'enteritis', parts: ['enter', 'itis'], term: 'Enteritis', korean: '장염', systems: ['gastroenterology'], definition: 'Inflammation of the intestine, especially the small intestine.', definitionKo: '장(특히 소장)의 염증입니다.' },
	{ id: 'gastroenteritis', parts: ['gastr', 'enter', 'itis'], term: 'Gastroenteritis', korean: '위장염', systems: ['gastroenterology'], definition: 'Inflammation of the stomach and intestines.', definitionKo: '위와 장에 함께 생긴 염증입니다.' },
	{ id: 'enteropathy', parts: ['enter', 'pathy'], term: 'Enteropathy', korean: '장병증', systems: ['gastroenterology'], definition: 'Any disease of the intestine.', definitionKo: '장의 질환을 통칭하는 말입니다.' },
	{ id: 'hepatectomy', parts: ['hepat', 'ectomy'], term: 'Hepatectomy', korean: '간절제술', systems: ['gastroenterology'], definition: 'Surgical removal of part or all of the liver.', definitionKo: '간의 일부 또는 전부를 절제하는 수술입니다.' },
	{ id: 'cholelithiasis', parts: ['chole', 'lith', 'iasis'], term: 'Cholelithiasis', korean: '담석증', systems: ['gastroenterology'], definition: 'The presence of stones in the gallbladder or bile ducts.', definitionKo: '쓸개나 담관에 결석이 생긴 상태입니다.' },
	{ id: 'cholecystectomy', parts: ['chole', 'cyst', 'ectomy'], term: 'Cholecystectomy', korean: '담낭절제술', systems: ['gastroenterology'], definition: 'Surgical removal of the gallbladder.', definitionKo: '쓸개(담낭)를 절제하는 수술입니다.' },
	{ id: 'pancreatectomy', parts: ['pancreat', 'ectomy'], term: 'Pancreatectomy', korean: '췌장절제술', systems: ['gastroenterology'], definition: 'Surgical removal of part or all of the pancreas.', definitionKo: '췌장의 일부 또는 전부를 절제하는 수술입니다.' },
	{ id: 'gastroscopy', parts: ['gastr', 'scopy'], term: 'Gastroscopy', korean: '위내시경검사', systems: ['gastroenterology'], definition: 'Visual examination of the stomach with an endoscope.', definitionKo: '내시경으로 위 내부를 들여다보는 검사입니다.' },

	// ── Nephrology 신장·비뇨학 ──
	{ id: 'nephrectomy', parts: ['nephr', 'ectomy'], term: 'Nephrectomy', korean: '신장절제술', systems: ['nephrology'], definition: 'Surgical removal of a kidney.', definitionKo: '신장(콩팥)을 절제하는 수술입니다.' },
	{ id: 'nephropathy', parts: ['nephr', 'pathy'], term: 'Nephropathy', korean: '신병증', systems: ['nephrology'], definition: 'Any disease or damage of the kidney.', definitionKo: '신장의 질환·손상을 통칭하는 말입니다.' },
	{ id: 'nephrosis', parts: ['nephr', 'osis'], term: 'Nephrosis', korean: '신증', systems: ['nephrology'], definition: 'A noninflammatory kidney disease, especially of the renal tubules.', definitionKo: '염증을 동반하지 않는 신장 질환입니다.' },
	{ id: 'hydronephrosis', parts: ['hydr', 'nephr', 'osis'], term: 'Hydronephrosis', korean: '수신증', systems: ['nephrology'], definition: 'Swelling of a kidney due to urine backup from an obstruction.', definitionKo: '소변이 빠져나가지 못해 신장이 물로 부푸는 상태입니다.' },
	{ id: 'dysuria', parts: ['dys', 'uria'], term: 'Dysuria', korean: '배뇨곤란', systems: ['nephrology'], definition: 'Painful or difficult urination.', definitionKo: '배뇨 시 통증이 있거나 소변이 잘 안 나오는 상태입니다.' },
	{ id: 'polyuria', parts: ['poly', 'uria'], term: 'Polyuria', korean: '다뇨', systems: ['nephrology'], definition: 'Production of abnormally large volumes of urine.', definitionKo: '소변량이 비정상적으로 많은 상태입니다.' },
	{ id: 'cystitis', parts: ['cyst', 'itis'], term: 'Cystitis', korean: '방광염', systems: ['nephrology'], definition: 'Inflammation of the urinary bladder.', definitionKo: '방광의 염증입니다.' },
	{ id: 'cystoscopy', parts: ['cyst', 'scopy'], term: 'Cystoscopy', korean: '방광경검사', systems: ['nephrology'], definition: 'Visual examination of the bladder with a scope.', definitionKo: '내시경으로 방광 내부를 들여다보는 검사입니다.' },

	// ── Pulmonology 호흡기학 ──
	{ id: 'bronchoscopy', parts: ['bronch', 'scopy'], term: 'Bronchoscopy', korean: '기관지경검사', systems: ['pulmonology'], definition: 'Visual examination of the airways with a bronchoscope.', definitionKo: '기관지경으로 기도 내부를 들여다보는 검사입니다.' },
	{ id: 'bronchopneumonia', parts: ['bronch', 'pneumo', 'ia'], term: 'Bronchopneumonia', korean: '기관지폐렴', systems: ['pulmonology'], definition: 'Pneumonia that begins in the bronchi and spreads into the lungs.', definitionKo: '기관지에서 시작해 폐로 번지는 폐렴입니다.' },
	{ id: 'tachypnea', parts: ['tachy', 'pnea'], term: 'Tachypnea', korean: '빈호흡', systems: ['pulmonology'], definition: 'Abnormally rapid breathing.', definitionKo: '비정상적으로 빠른 호흡입니다.' },
	{ id: 'bradypnea', parts: ['brady', 'pnea'], term: 'Bradypnea', korean: '서호흡', systems: ['pulmonology'], definition: 'Abnormally slow breathing.', definitionKo: '비정상적으로 느린 호흡입니다.' },
	{ id: 'apnea', parts: ['a', 'pnea'], term: 'Apnea', korean: '무호흡', systems: ['pulmonology'], definition: 'Temporary cessation of breathing.', definitionKo: '호흡이 일시적으로 멈추는 상태입니다.' },
	{ id: 'pneumonectomy', parts: ['pneumo', 'ectomy'], term: 'Pneumonectomy', korean: '폐절제술', systems: ['pulmonology'], definition: 'Surgical removal of a lung or a lung lobe.', definitionKo: '폐(또는 폐엽)를 절제하는 수술입니다.' },
	{ id: 'thoracotomy', parts: ['thorax', 'otomy'], term: 'Thoracotomy', korean: '개흉술', systems: ['pulmonology'], definition: 'Surgical incision into the chest wall.', definitionKo: '가슴 벽을 절개해 흉강을 여는 수술입니다.' },

	// ── Musculoskeletal 근골격계 ──
	{ id: 'osteitis', parts: ['oste', 'itis'], term: 'Osteitis', korean: '골염', systems: ['musculoskeletal'], definition: 'Inflammation of bone.', definitionKo: '뼈의 염증입니다.' },
	{ id: 'osteoma', parts: ['oste', 'oma'], term: 'Osteoma', korean: '골종', systems: ['musculoskeletal'], definition: 'A benign tumor of bone.', definitionKo: '뼈에 생기는 양성 종양입니다.' },
	{ id: 'osteopathy', parts: ['oste', 'pathy'], term: 'Osteopathy', korean: '골병증', systems: ['musculoskeletal'], definition: 'Any disease of the bone.', definitionKo: '뼈의 질환을 통칭하는 말입니다.' },
	{ id: 'osteotomy', parts: ['oste', 'otomy'], term: 'Osteotomy', korean: '절골술', systems: ['musculoskeletal'], definition: 'Surgical cutting of a bone to reshape or realign it.', definitionKo: '뼈를 잘라 모양·정렬을 바로잡는 수술입니다.' },
	{ id: 'myalgia', parts: ['my', 'algia'], term: 'Myalgia', korean: '근육통', systems: ['musculoskeletal'], definition: 'Muscle pain.', definitionKo: '근육의 통증입니다.' },
	{ id: 'myopathy', parts: ['my', 'pathy'], term: 'Myopathy', korean: '근병증', systems: ['musculoskeletal'], definition: 'Any disease of muscle tissue.', definitionKo: '근육 조직의 질환을 통칭하는 말입니다.' },
	{ id: 'fibroma', parts: ['fibr', 'oma'], term: 'Fibroma', korean: '섬유종', systems: ['musculoskeletal'], definition: 'A benign tumor of fibrous connective tissue.', definitionKo: '섬유성 결합 조직에 생기는 양성 종양입니다.' },

	// ══ 보정사 전계통 보강 (빈 계통 채우기) ══════════════════════════
	// ── Endocrinology 내분비학 → 내분비계통 ──
	{ id: 'hyperglycemia', parts: ['hyper', 'glyc', 'emia'], term: 'Hyperglycemia', korean: '고혈당', systems: ['endocrinology'], definition: 'An abnormally high level of glucose in the blood, characteristic of diabetes.', definitionKo: '혈중 포도당 농도가 비정상적으로 높은 상태로, 당뇨병의 특징입니다.' },
	{ id: 'hypoglycemia', parts: ['hypo', 'glyc', 'emia'], term: 'Hypoglycemia', korean: '저혈당', systems: ['endocrinology'], definition: 'An abnormally low level of glucose in the blood.', definitionKo: '혈중 포도당 농도가 비정상적으로 낮은 상태입니다.' },
	{ id: 'thyroiditis', parts: ['thyroid', 'itis'], term: 'Thyroiditis', korean: '갑상선염', systems: ['endocrinology'], definition: 'Inflammation of the thyroid gland.', definitionKo: '갑상선의 염증입니다.' },
	{ id: 'thyroidectomy', parts: ['thyroid', 'ectomy'], term: 'Thyroidectomy', korean: '갑상선절제술', systems: ['endocrinology'], definition: 'Surgical removal of all or part of the thyroid gland.', definitionKo: '갑상선의 전부 또는 일부를 절제하는 수술입니다.' },
	{ id: 'adenoma', parts: ['aden', 'oma'], term: 'Adenoma', korean: '선종', systems: ['endocrinology'], definition: 'A benign tumor arising from glandular tissue.', definitionKo: '샘(선) 조직에서 생기는 양성 종양입니다.' },
	{ id: 'adenitis', parts: ['aden', 'itis'], term: 'Adenitis', korean: '샘염', systems: ['endocrinology'], definition: 'Inflammation of a gland or lymph node.', definitionKo: '샘(또는 림프절)의 염증입니다.' },
	{ id: 'adenopathy', parts: ['aden', 'pathy'], term: 'Adenopathy', korean: '샘병증', systems: ['endocrinology'], definition: 'Disease or enlargement of glands, especially the lymph nodes.', definitionKo: '샘(특히 림프절)의 질환이나 비대를 말합니다.' },

	// ── Gynecology 부인과학 → 여성 생식계통 및 유방 ──
	{ id: 'gynecology', parts: ['gynec', 'logy'], term: 'Gynecology', korean: '부인과학', systems: ['gynecology'], definition: "The branch of medicine concerned with the female reproductive system.", definitionKo: '여성 생식기를 다루는 의학 분야입니다.' },
	{ id: 'mastitis', parts: ['mast', 'itis'], term: 'Mastitis', korean: '유방염', systems: ['gynecology'], definition: 'Inflammation of breast tissue, often associated with breastfeeding.', definitionKo: '유방 조직의 염증으로, 흔히 수유와 관련됩니다.' },
	{ id: 'mastectomy', parts: ['mast', 'ectomy'], term: 'Mastectomy', korean: '유방절제술', systems: ['gynecology'], definition: 'Surgical removal of a breast, commonly to treat breast cancer.', definitionKo: '유방을 절제하는 수술로, 주로 유방암 치료에 시행합니다.' },
	{ id: 'mastopathy', parts: ['mast', 'pathy'], term: 'Mastopathy', korean: '유방병증', systems: ['gynecology'], definition: 'Any disease of the breast.', definitionKo: '유방의 질환을 통칭하는 말입니다.' },
	{ id: 'hysterectomy', parts: ['hyster', 'ectomy'], term: 'Hysterectomy', korean: '자궁절제술', systems: ['gynecology'], definition: 'Surgical removal of the uterus.', definitionKo: '자궁을 절제하는 수술입니다.' },
	{ id: 'oophoritis', parts: ['oophor', 'itis'], term: 'Oophoritis', korean: '난소염', systems: ['gynecology'], definition: 'Inflammation of an ovary.', definitionKo: '난소의 염증입니다.' },
	{ id: 'oophorectomy', parts: ['oophor', 'ectomy'], term: 'Oophorectomy', korean: '난소절제술', systems: ['gynecology'], definition: 'Surgical removal of one or both ovaries.', definitionKo: '한쪽 또는 양쪽 난소를 절제하는 수술입니다.' },
	{ id: 'salpingitis', parts: ['salping', 'itis'], term: 'Salpingitis', korean: '난관염', systems: ['gynecology'], definition: 'Inflammation of a fallopian tube.', definitionKo: '난관(나팔관)의 염증입니다.' },

	// ── Obstetrics 산과학 → 임신·출산·신생아 ──
	{ id: 'natal', parts: ['nat', 'al'], term: 'Natal', korean: '출생의', systems: ['obstetrics'], definition: 'Relating to the place or time of birth.', definitionKo: '출생(의 시기·장소)에 관한 것을 뜻합니다.' },
	{ id: 'prenatal', parts: ['pre', 'nat', 'al'], term: 'Prenatal', korean: '산전의', systems: ['obstetrics'], definition: 'Occurring or existing before birth.', definitionKo: '출생 이전에 일어나거나 존재하는 것을 뜻합니다.' },
	{ id: 'perinatal', parts: ['peri', 'nat', 'al'], term: 'Perinatal', korean: '주산기의', systems: ['obstetrics'], definition: 'Relating to the period shortly before and after birth.', definitionKo: '출생 직전·직후의 시기에 관한 것을 뜻합니다.' },
	{ id: 'neonatal', parts: ['neo', 'nat', 'al'], term: 'Neonatal', korean: '신생아의', systems: ['obstetrics'], definition: 'Relating to newborn infants, especially the first four weeks after birth.', definitionKo: '신생아(특히 생후 4주)에 관한 것을 뜻합니다.' },
	{ id: 'postnatal', parts: ['post', 'nat', 'al'], term: 'Postnatal', korean: '산후의', systems: ['obstetrics'], definition: 'Occurring or relating to the period after childbirth.', definitionKo: '출산 이후의 시기에 관한 것을 뜻합니다.' },
	{ id: 'amniocentesis', parts: ['amni', 'centesis'], term: 'Amniocentesis', korean: '양수천자', systems: ['obstetrics'], definition: 'A procedure to sample amniotic fluid for prenatal diagnosis.', definitionKo: '산전 진단을 위해 양수를 채취하는 천자 시술입니다.' },

	// ── Andrology 남성의학 → 남성 생식계통 ──
	{ id: 'orchitis', parts: ['orchi', 'itis'], term: 'Orchitis', korean: '고환염', systems: ['andrology'], definition: 'Inflammation of one or both testes.', definitionKo: '한쪽 또는 양쪽 고환의 염증입니다.' },
	{ id: 'orchiectomy', parts: ['orchi', 'ectomy'], term: 'Orchiectomy', korean: '고환절제술', systems: ['andrology'], definition: 'Surgical removal of one or both testes.', definitionKo: '한쪽 또는 양쪽 고환을 절제하는 수술입니다.' },
	{ id: 'prostatitis', parts: ['prostat', 'itis'], term: 'Prostatitis', korean: '전립선염', systems: ['andrology'], definition: 'Inflammation of the prostate gland.', definitionKo: '전립선의 염증입니다.' },
	{ id: 'prostatectomy', parts: ['prostat', 'ectomy'], term: 'Prostatectomy', korean: '전립선절제술', systems: ['andrology'], definition: 'Surgical removal of all or part of the prostate gland.', definitionKo: '전립선의 전부 또는 일부를 절제하는 수술입니다.' },
	{ id: 'prostatomegaly', parts: ['prostat', 'megaly'], term: 'Prostatomegaly', korean: '전립선비대', systems: ['andrology'], definition: 'Enlargement of the prostate gland.', definitionKo: '전립선이 비정상적으로 커진 상태입니다.' },
	{ id: 'vasectomy', parts: ['vas', 'ectomy'], term: 'Vasectomy', korean: '정관절제술', systems: ['andrology'], definition: 'Surgical division or removal of part of the vas deferens for male sterilization.', definitionKo: '남성 불임을 위해 정관의 일부를 절제·차단하는 수술입니다.' },

	// ── Ophthalmology/Otology 안과·이과 → 감각계통(눈·귀) ──
	{ id: 'ophthalmology', parts: ['ophthalm', 'logy'], term: 'Ophthalmology', korean: '안과학', systems: ['ophthalmology'], definition: 'The branch of medicine dealing with the eye and its diseases.', definitionKo: '눈과 눈의 질환을 다루는 의학 분야입니다.' },
	{ id: 'ophthalmoscopy', parts: ['ophthalm', 'scopy'], term: 'Ophthalmoscopy', korean: '검안경검사', systems: ['ophthalmology'], definition: 'Examination of the interior of the eye with an ophthalmoscope.', definitionKo: '검안경으로 눈 내부를 들여다보는 검사입니다.' },
	{ id: 'retinitis', parts: ['retin', 'itis'], term: 'Retinitis', korean: '망막염', systems: ['ophthalmology'], definition: 'Inflammation of the retina.', definitionKo: '망막의 염증입니다.' },
	{ id: 'retinopathy', parts: ['retin', 'pathy'], term: 'Retinopathy', korean: '망막병증', systems: ['ophthalmology'], definition: 'Disease of the retina, a common complication of diabetes.', definitionKo: '망막의 질환으로, 당뇨병의 흔한 합병증입니다.' },
	{ id: 'otitis', parts: ['ot', 'itis'], term: 'Otitis', korean: '귀염', systems: ['otology'], definition: 'Inflammation of the ear (e.g., otitis media, middle ear infection).', definitionKo: '귀의 염증입니다(예: 중이염).' },
	{ id: 'otoscopy', parts: ['ot', 'scopy'], term: 'Otoscopy', korean: '귀보개검사', systems: ['otology'], definition: 'Visual examination of the ear canal and eardrum with an otoscope.', definitionKo: '귀보개로 외이도와 고막을 들여다보는 검사입니다.' },
	{ id: 'otalgia', parts: ['ot', 'algia'], term: 'Otalgia', korean: '귀통증', systems: ['otology'], definition: 'Pain in the ear; earache.', definitionKo: '귀의 통증, 즉 귀앓이입니다.' },

	// ── Dermatology 피부과학 → 외피계통 (외피 보강) ──
	{ id: 'dermatitis', parts: ['derm', 'itis'], term: 'Dermatitis', korean: '피부염', systems: ['dermatology'], definition: 'Inflammation of the skin, causing redness, itching, and irritation.', definitionKo: '피부의 염증으로 발적, 가려움, 자극을 유발합니다.' },
	{ id: 'dermatology', parts: ['derm', 'logy'], term: 'Dermatology', korean: '피부과학', systems: ['dermatology'], definition: 'The branch of medicine concerned with the skin and its diseases.', definitionKo: '피부와 피부 질환을 다루는 의학 분야입니다.' },
	{ id: 'dermatosis', parts: ['derm', 'osis'], term: 'Dermatosis', korean: '피부증', systems: ['dermatology'], definition: 'Any noninflammatory disease of the skin.', definitionKo: '염증을 동반하지 않는 피부 질환을 통칭합니다.' },
	{ id: 'epidermal', parts: ['epi', 'derm', 'al'], term: 'Epidermal', korean: '표피의', systems: ['dermatology'], definition: 'Relating to the epidermis, the outermost layer of skin.', definitionKo: '피부의 가장 바깥층인 표피에 관한 것을 뜻합니다.' },

	// ───────────── 확장 배치 v2: 근골격 ─────────────
	{ id: 'arthritis', parts: ['arthr', 'itis'], term: 'Arthritis', korean: '관절염', systems: ['musculoskeletal'], definition: 'Inflammation of one or more joints, causing pain and stiffness.', definitionKo: '하나 이상의 관절에 생기는 염증으로 통증과 뻣뻣함을 유발합니다.' },
	{ id: 'arthropathy', parts: ['arthr', 'pathy'], term: 'Arthropathy', korean: '관절병증', systems: ['musculoskeletal'], definition: 'Any disease affecting a joint.', definitionKo: '관절을 침범하는 질환을 통칭합니다.' },
	{ id: 'arthroscopy', parts: ['arthr', 'scopy'], term: 'Arthroscopy', korean: '관절경검사', systems: ['musculoskeletal'], definition: 'Visual examination of the inside of a joint using a scope.', definitionKo: '관절경을 넣어 관절 내부를 들여다보는 검사입니다.' },
	{ id: 'arthroplasty', parts: ['arthr', 'plasty'], term: 'Arthroplasty', korean: '관절성형술', systems: ['musculoskeletal'], definition: 'Surgical repair or replacement of a joint.', definitionKo: '관절을 외과적으로 복원하거나 치환하는 수술입니다.' },
	{ id: 'chondritis', parts: ['chondr', 'itis'], term: 'Chondritis', korean: '연골염', systems: ['musculoskeletal'], definition: 'Inflammation of cartilage.', definitionKo: '연골에 생기는 염증입니다.' },
	{ id: 'chondroma', parts: ['chondr', 'oma'], term: 'Chondroma', korean: '연골종', systems: ['musculoskeletal'], definition: 'A benign tumor of cartilage.', definitionKo: '연골에서 생기는 양성 종양입니다.' },
	{ id: 'chondromalacia', parts: ['chondr', 'malacia'], term: 'Chondromalacia', korean: '연골연화증', systems: ['musculoskeletal'], definition: 'Softening and deterioration of cartilage.', definitionKo: '연골이 물러지고 약해지는 상태입니다.' },
	{ id: 'osteomalacia', parts: ['oste', 'malacia'], term: 'Osteomalacia', korean: '골연화증', systems: ['musculoskeletal'], definition: 'Softening of bone, often from vitamin D deficiency.', definitionKo: '뼈가 물러지는 질환으로 흔히 비타민 D 결핍이 원인입니다.' },
	{ id: 'osteomyelitis', parts: ['oste', 'myel', 'itis'], term: 'Osteomyelitis', korean: '골수염', systems: ['musculoskeletal'], definition: 'Infection and inflammation of bone and bone marrow.', definitionKo: '뼈와 골수에 생기는 감염성 염증입니다.' },
	{ id: 'craniotomy', parts: ['crani', 'otomy'], term: 'Craniotomy', korean: '개두술', systems: ['neurology'], definition: 'Surgical incision into the skull to access the brain.', definitionKo: '뇌에 접근하기 위해 두개골을 절개하는 수술입니다.' },
	{ id: 'cranial', parts: ['crani', 'al'], term: 'Cranial', korean: '두개의', systems: ['anatomy'], definition: 'Pertaining to the skull or cranium.', definitionKo: '두개골에 관한 것을 뜻합니다.' },

	// ───────────── 확장 배치 v2: 혈액 ─────────────
	{ id: 'splenomegaly', parts: ['splen', 'megaly'], term: 'Splenomegaly', korean: '비장비대', systems: ['hematology'], definition: 'Abnormal enlargement of the spleen.', definitionKo: '비장이 비정상적으로 커진 상태입니다.' },
	{ id: 'splenectomy', parts: ['splen', 'ectomy'], term: 'Splenectomy', korean: '비장절제술', systems: ['hematology'], definition: 'Surgical removal of the spleen.', definitionKo: '비장을 외과적으로 제거하는 수술입니다.' },
	{ id: 'lymphoma', parts: ['lymph', 'oma'], term: 'Lymphoma', korean: '림프종', systems: ['hematology'], definition: 'A cancer originating in lymphatic tissue.', definitionKo: '림프 조직에서 생기는 암입니다.' },
	{ id: 'lymphadenitis', parts: ['lymph', 'aden', 'itis'], term: 'Lymphadenitis', korean: '림프절염', systems: ['hematology'], definition: 'Inflammation of lymph nodes.', definitionKo: '림프절에 생기는 염증입니다.' },
	{ id: 'lymphadenopathy', parts: ['lymph', 'aden', 'pathy'], term: 'Lymphadenopathy', korean: '림프절병증', systems: ['hematology'], definition: 'Disease or swelling of the lymph nodes.', definitionKo: '림프절이 붓거나 병든 상태입니다.' },
	{ id: 'erythrocyte', parts: ['erythr', 'cyt'], term: 'Erythrocyte', korean: '적혈구', systems: ['hematology'], definition: 'A red blood cell that carries oxygen.', definitionKo: '산소를 운반하는 적혈구입니다.' },

	// ───────────── 확장 배치 v2: 호흡·상기도 ─────────────
	{ id: 'rhinitis', parts: ['rhin', 'itis'], term: 'Rhinitis', korean: '비염', systems: ['pulmonology'], definition: 'Inflammation of the mucous membrane of the nose.', definitionKo: '코 점막에 생기는 염증입니다.' },
	{ id: 'rhinorrhea', parts: ['rhin', 'rrhea'], term: 'Rhinorrhea', korean: '콧물, 비루', systems: ['pulmonology'], definition: 'A runny nose; discharge of thin nasal fluid.', definitionKo: '맑은 콧물이 흐르는 증상입니다.' },
	{ id: 'rhinoplasty', parts: ['rhin', 'plasty'], term: 'Rhinoplasty', korean: '코성형술', systems: ['pulmonology'], definition: 'Surgical reshaping or repair of the nose.', definitionKo: '코의 모양을 교정하거나 복원하는 수술입니다.' },
	{ id: 'laryngitis', parts: ['laryng', 'itis'], term: 'Laryngitis', korean: '후두염', systems: ['pulmonology'], definition: 'Inflammation of the larynx, often causing hoarseness.', definitionKo: '후두에 생기는 염증으로 흔히 목이 쉽니다.' },
	{ id: 'laryngoscopy', parts: ['laryng', 'scopy'], term: 'Laryngoscopy', korean: '후두경검사', systems: ['pulmonology'], definition: 'Visual examination of the larynx with a scope.', definitionKo: '후두경으로 후두를 들여다보는 검사입니다.' },
	{ id: 'pharyngitis', parts: ['pharyng', 'itis'], term: 'Pharyngitis', korean: '인두염', systems: ['pulmonology'], definition: 'Inflammation of the pharynx; a sore throat.', definitionKo: '인두에 생기는 염증으로 인후통을 유발합니다.' },
	{ id: 'tracheitis', parts: ['trache', 'itis'], term: 'Tracheitis', korean: '기관염', systems: ['pulmonology'], definition: 'Inflammation of the trachea.', definitionKo: '기관에 생기는 염증입니다.' },
	{ id: 'tracheotomy', parts: ['trache', 'otomy'], term: 'Tracheotomy', korean: '기관절개술', systems: ['pulmonology'], definition: 'Surgical incision into the trachea to create an airway.', definitionKo: '기도를 확보하기 위해 기관을 절개하는 수술입니다.' },
	{ id: 'tracheostomy', parts: ['trache', 'stomy'], term: 'Tracheostomy', korean: '기관조루술', systems: ['pulmonology'], definition: 'Creation of a surgical opening into the trachea.', definitionKo: '기관에 영구적 또는 일시적 구멍을 만드는 수술입니다.' },

	// ───────────── 확장 배치 v2: 소화·하부위장 ─────────────
	{ id: 'colitis', parts: ['col', 'itis'], term: 'Colitis', korean: '결장염, 대장염', systems: ['gastroenterology'], definition: 'Inflammation of the colon.', definitionKo: '결장(대장)에 생기는 염증입니다.' },
	{ id: 'colectomy', parts: ['col', 'ectomy'], term: 'Colectomy', korean: '결장절제술', systems: ['gastroenterology'], definition: 'Surgical removal of all or part of the colon.', definitionKo: '결장의 전체 또는 일부를 절제하는 수술입니다.' },
	{ id: 'colostomy', parts: ['col', 'stomy'], term: 'Colostomy', korean: '결장조루술', systems: ['gastroenterology'], definition: 'Surgical creation of an opening from the colon to the abdominal wall.', definitionKo: '결장을 복벽으로 연결해 인공 항문을 만드는 수술입니다.' },
	{ id: 'colonoscopy', parts: ['col', 'scopy'], term: 'Colonoscopy', korean: '대장내시경검사', systems: ['gastroenterology'], definition: 'Visual examination of the colon with a long flexible scope.', definitionKo: '긴 내시경으로 대장 내부를 들여다보는 검사입니다.' },
	{ id: 'proctitis', parts: ['proct', 'itis'], term: 'Proctitis', korean: '직장염', systems: ['gastroenterology'], definition: 'Inflammation of the rectum and anus.', definitionKo: '직장과 항문에 생기는 염증입니다.' },
	{ id: 'proctoscopy', parts: ['proct', 'scopy'], term: 'Proctoscopy', korean: '직장경검사', systems: ['gastroenterology'], definition: 'Visual examination of the rectum with a scope.', definitionKo: '직장경으로 직장을 들여다보는 검사입니다.' },

	// ───────────── 확장 배치 v2: 비뇨·신장 ─────────────
	{ id: 'pyelonephritis', parts: ['pyel', 'nephr', 'itis'], term: 'Pyelonephritis', korean: '신우신염', systems: ['nephrology'], definition: 'Inflammation of the renal pelvis and kidney, usually from infection.', definitionKo: '신우와 신장에 생기는 염증으로 보통 감염이 원인입니다.' },
	{ id: 'pyelogram', parts: ['pyel', 'gram'], term: 'Pyelogram', korean: '신우조영상', systems: ['nephrology'], definition: 'An X-ray image of the renal pelvis and urinary tract.', definitionKo: '신우와 요로를 촬영한 조영 영상입니다.' },
	{ id: 'urology', parts: ['ur', 'logy'], term: 'Urology', korean: '비뇨기과학', systems: ['nephrology'], definition: 'The branch of medicine dealing with the urinary tract.', definitionKo: '요로(비뇨계)를 다루는 의학 분야입니다.' },
	{ id: 'uremia', parts: ['ur', 'emia'], term: 'Uremia', korean: '요독증', systems: ['nephrology'], definition: 'A toxic buildup of urea and wastes in the blood from kidney failure.', definitionKo: '신부전으로 요소 등 노폐물이 혈액에 쌓이는 상태입니다.' },
	{ id: 'urologist', parts: ['ur', 'logist'], term: 'Urologist', korean: '비뇨기과 전문의', systems: ['nephrology'], definition: 'A physician who specializes in the urinary tract.', definitionKo: '요로 질환을 전문으로 보는 의사입니다.' },

	// ───────────── 확장 배치 v2: 종양·병리 ─────────────
	{ id: 'carcinoma', parts: ['carcin', 'oma'], term: 'Carcinoma', korean: '암종', systems: ['pathology'], definition: 'A cancer arising from epithelial tissue.', definitionKo: '상피 조직에서 생기는 암입니다.' },
	{ id: 'adenocarcinoma', parts: ['aden', 'carcin', 'oma'], term: 'Adenocarcinoma', korean: '선암', systems: ['pathology'], definition: 'A carcinoma arising from glandular tissue.', definitionKo: '샘(선) 조직에서 생기는 암종입니다.' },
	{ id: 'myeloma', parts: ['myel', 'oma'], term: 'Myeloma', korean: '골수종', systems: ['hematology'], definition: 'A tumor of plasma cells in the bone marrow.', definitionKo: '골수의 형질세포에서 생기는 종양입니다.' },
	{ id: 'myelopathy', parts: ['myel', 'pathy'], term: 'Myelopathy', korean: '척수병증', systems: ['neurology'], definition: 'Any disease of the spinal cord.', definitionKo: '척수에 생기는 질환을 통칭합니다.' },

	// ───────────── 확장 배치 v2: 피부·외피 ─────────────
	{ id: 'melanoma', parts: ['melan', 'oma'], term: 'Melanoma', korean: '흑색종', systems: ['dermatology'], definition: 'A malignant tumor of melanin-producing skin cells.', definitionKo: '멜라닌 세포에서 생기는 악성 피부암입니다.' },
	{ id: 'melanosis', parts: ['melan', 'osis'], term: 'Melanosis', korean: '흑색증', systems: ['dermatology'], definition: 'Abnormal dark pigmentation of tissue.', definitionKo: '조직에 멜라닌이 비정상적으로 침착된 상태입니다.' },
	{ id: 'mycosis', parts: ['myc', 'osis'], term: 'Mycosis', korean: '진균증', systems: ['dermatology'], definition: 'Any disease caused by a fungus.', definitionKo: '진균(곰팡이) 감염으로 생기는 질환입니다.' },
	{ id: 'dermatomycosis', parts: ['derm', 'myc', 'osis'], term: 'Dermatomycosis', korean: '피부진균증', systems: ['dermatology'], definition: 'A fungal infection of the skin.', definitionKo: '피부에 생긴 진균 감염입니다.' },
	{ id: 'onychomycosis', parts: ['onych', 'myc', 'osis'], term: 'Onychomycosis', korean: '손발톱진균증', systems: ['dermatology'], definition: 'A fungal infection of the nails.', definitionKo: '손발톱에 생긴 진균 감염입니다.' },
	{ id: 'lipoma', parts: ['lip', 'oma'], term: 'Lipoma', korean: '지방종', systems: ['dermatology'], definition: 'A benign tumor of fatty tissue.', definitionKo: '지방 조직에서 생기는 양성 종양입니다.' },
	{ id: 'keratosis', parts: ['kerat', 'osis'], term: 'Keratosis', korean: '각화증', systems: ['dermatology'], definition: 'A horny thickening of the skin.', definitionKo: '피부 각질이 두꺼워지는 상태입니다.' },
	{ id: 'erythroderma', parts: ['erythr', 'derm'], term: 'Erythroderma', korean: '홍색피부증', systems: ['dermatology'], definition: 'Widespread redness of the skin.', definitionKo: '피부가 광범위하게 붉어지는 상태입니다.' },

	// ───────────── 확장 배치 v2: 안과 ─────────────
	{ id: 'keratitis', parts: ['kerat', 'itis'], term: 'Keratitis', korean: '각막염', systems: ['ophthalmology'], definition: 'Inflammation of the cornea.', definitionKo: '각막에 생기는 염증입니다.' },
	{ id: 'ocular', parts: ['ocul', 'ar'], term: 'Ocular', korean: '눈의, 안구의', systems: ['ophthalmology'], definition: 'Pertaining to the eye.', definitionKo: '눈(안구)에 관한 것을 뜻합니다.' },
	{ id: 'intraocular', parts: ['intra', 'ocul', 'ar'], term: 'Intraocular', korean: '안구내의', systems: ['ophthalmology'], definition: 'Located or occurring within the eyeball.', definitionKo: '안구 내부에 있거나 발생하는 것을 뜻합니다.' },
	{ id: 'blepharitis', parts: ['blephar', 'itis'], term: 'Blepharitis', korean: '눈꺼풀염', systems: ['ophthalmology'], definition: 'Inflammation of the eyelids.', definitionKo: '눈꺼풀에 생기는 염증입니다.' },
	{ id: 'blepharoptosis', parts: ['blephar', 'ptosis'], term: 'Blepharoptosis', korean: '눈꺼풀처짐, 안검하수', systems: ['ophthalmology'], definition: 'Drooping of the upper eyelid.', definitionKo: '윗눈꺼풀이 처지는 상태입니다.' },
	{ id: 'blepharoplasty', parts: ['blephar', 'plasty'], term: 'Blepharoplasty', korean: '눈꺼풀성형술', systems: ['ophthalmology'], definition: 'Surgical repair or reshaping of the eyelid.', definitionKo: '눈꺼풀을 복원하거나 교정하는 수술입니다.' },

	// ───────────── 확장 배치 v2: 부인과·생식 ─────────────
	{ id: 'menorrhea', parts: ['men', 'rrhea'], term: 'Menorrhea', korean: '월경', systems: ['gynecology'], definition: 'Normal menstrual flow.', definitionKo: '정상적인 월경 출혈을 뜻합니다.' },
	{ id: 'dysmenorrhea', parts: ['dys', 'men', 'rrhea'], term: 'Dysmenorrhea', korean: '월경통, 월경곤란', systems: ['gynecology'], definition: 'Painful or difficult menstruation.', definitionKo: '통증을 동반하는 월경을 뜻합니다.' },
	{ id: 'amenorrhea', parts: ['a', 'men', 'rrhea'], term: 'Amenorrhea', korean: '무월경', systems: ['gynecology'], definition: 'Absence of menstruation.', definitionKo: '월경이 없는 상태입니다.' },
	{ id: 'menorrhagia', parts: ['men', 'rrhagia'], term: 'Menorrhagia', korean: '월경과다', systems: ['gynecology'], definition: 'Abnormally heavy or prolonged menstrual bleeding.', definitionKo: '월경 출혈이 비정상적으로 많거나 오래 지속되는 상태입니다.' },
	{ id: 'metrorrhagia', parts: ['metr', 'rrhagia'], term: 'Metrorrhagia', korean: '부정자궁출혈', systems: ['gynecology'], definition: 'Uterine bleeding at irregular times outside of menstruation.', definitionKo: '월경 주기와 무관하게 불규칙하게 생기는 자궁 출혈입니다.' },
	{ id: 'endometritis', parts: ['endo', 'metr', 'itis'], term: 'Endometritis', korean: '자궁내막염', systems: ['gynecology'], definition: 'Inflammation of the lining of the uterus.', definitionKo: '자궁 내막에 생기는 염증입니다.' },
	{ id: 'colposcopy', parts: ['colp', 'scopy'], term: 'Colposcopy', korean: '질확대경검사', systems: ['gynecology'], definition: 'Examination of the vagina and cervix with a magnifying scope.', definitionKo: '확대경으로 질과 자궁경부를 들여다보는 검사입니다.' },

	// ───────────── 확장 배치 v2: 내분비 ─────────────
	{ id: 'acromegaly', parts: ['acr', 'megaly'], term: 'Acromegaly', korean: '말단비대증', systems: ['endocrinology'], definition: 'Enlargement of the extremities from excess growth hormone.', definitionKo: '성장호르몬 과다로 손발 등 말단이 커지는 질환입니다.' },
	{ id: 'polydipsia', parts: ['poly', 'dipsia'], term: 'Polydipsia', korean: '다음증', systems: ['endocrinology'], definition: 'Excessive thirst, a common sign of diabetes.', definitionKo: '과도한 갈증으로 당뇨의 흔한 증상입니다.' },

	// ───────────── 확장 배치 v2: 전문의(specialist) ─────────────
	{ id: 'cardiologist', parts: ['cardi', 'logist'], term: 'Cardiologist', korean: '심장 전문의', systems: ['cardiology'], definition: 'A physician who specializes in heart disease.', definitionKo: '심장 질환을 전문으로 보는 의사입니다.' },
	{ id: 'dermatologist', parts: ['derm', 'logist'], term: 'Dermatologist', korean: '피부과 전문의', systems: ['dermatology'], definition: 'A physician who specializes in skin disease.', definitionKo: '피부 질환을 전문으로 보는 의사입니다.' },

	// ───────────── 확장 배치 v3: 비뇨생식 ─────────────
	{ id: 'vaginitis', parts: ['vagin', 'itis'], term: 'Vaginitis', korean: '질염', systems: ['gynecology'], definition: 'Inflammation of the vagina.', definitionKo: '질에 생기는 염증입니다.' },
	{ id: 'vaginal', parts: ['vagin', 'al'], term: 'Vaginal', korean: '질의', systems: ['gynecology'], definition: 'Pertaining to the vagina.', definitionKo: '질에 관한 것을 뜻합니다.' },
	{ id: 'urethritis', parts: ['urethr', 'itis'], term: 'Urethritis', korean: '요도염', systems: ['nephrology'], definition: 'Inflammation of the urethra.', definitionKo: '요도에 생기는 염증입니다.' },
	{ id: 'urethroscopy', parts: ['urethr', 'scopy'], term: 'Urethroscopy', korean: '요도경검사', systems: ['nephrology'], definition: 'Visual examination of the urethra with a scope.', definitionKo: '요도경으로 요도를 들여다보는 검사입니다.' },
	{ id: 'ureteritis', parts: ['ureter', 'itis'], term: 'Ureteritis', korean: '요관염', systems: ['nephrology'], definition: 'Inflammation of the ureter.', definitionKo: '요관에 생기는 염증입니다.' },
	{ id: 'ureterostomy', parts: ['ureter', 'stomy'], term: 'Ureterostomy', korean: '요관조루술', systems: ['nephrology'], definition: 'Surgical creation of an opening into the ureter.', definitionKo: '요관에 인공 개구부를 만드는 수술입니다.' },
	{ id: 'cystocele', parts: ['cyst', 'cele'], term: 'Cystocele', korean: '방광류', systems: ['gynecology'], definition: 'Herniation of the bladder into the vaginal wall.', definitionKo: '방광이 질벽 쪽으로 탈출한 상태입니다.' },
	{ id: 'balanitis', parts: ['balan', 'itis'], term: 'Balanitis', korean: '귀두염', systems: ['andrology'], definition: 'Inflammation of the glans penis.', definitionKo: '귀두에 생기는 염증입니다.' },
	{ id: 'epididymitis', parts: ['epididym', 'itis'], term: 'Epididymitis', korean: '부고환염', systems: ['andrology'], definition: 'Inflammation of the epididymis.', definitionKo: '부고환에 생기는 염증입니다.' },

	// ───────────── 확장 배치 v3: 임신·출산 ─────────────
	{ id: 'placental', parts: ['placent', 'al'], term: 'Placental', korean: '태반의', systems: ['obstetrics'], definition: 'Pertaining to the placenta.', definitionKo: '태반에 관한 것을 뜻합니다.' },
	{ id: 'placentitis', parts: ['placent', 'itis'], term: 'Placentitis', korean: '태반염', systems: ['obstetrics'], definition: 'Inflammation of the placenta.', definitionKo: '태반에 생기는 염증입니다.' },

	// ───────────── 확장 배치 v3: 유방 ─────────────
	{ id: 'mammogram', parts: ['mamm', 'gram'], term: 'Mammogram', korean: '유방촬영상', systems: ['gynecology'], definition: 'An X-ray image of the breast used to screen for cancer.', definitionKo: '유방을 촬영한 영상으로 암 선별에 쓰입니다.' },
	{ id: 'mammography', parts: ['mamm', 'graphy'], term: 'Mammography', korean: '유방촬영술', systems: ['gynecology'], definition: 'The process of imaging the breast by X-ray.', definitionKo: '유방을 X선으로 촬영하는 검사법입니다.' },
	{ id: 'mammoplasty', parts: ['mamm', 'plasty'], term: 'Mammoplasty', korean: '유방성형술', systems: ['gynecology'], definition: 'Surgical reconstruction or reshaping of the breast.', definitionKo: '유방을 재건하거나 모양을 교정하는 수술입니다.' },

	// ───────────── 확장 배치 v3: 심장·혈관 ─────────────
	{ id: 'ventricular', parts: ['ventricul', 'ar'], term: 'Ventricular', korean: '심실의', systems: ['cardiology'], definition: 'Pertaining to a ventricle of the heart.', definitionKo: '심장의 심실에 관한 것을 뜻합니다.' },
	{ id: 'ventriculogram', parts: ['ventricul', 'gram'], term: 'Ventriculogram', korean: '심실조영상', systems: ['cardiology'], definition: 'An imaging study of a ventricle of the heart.', definitionKo: '심실을 촬영한 조영 영상입니다.' },
	{ id: 'ventriculitis', parts: ['ventricul', 'itis'], term: 'Ventriculitis', korean: '뇌실염', systems: ['neurology'], definition: 'Inflammation of the ventricles of the brain.', definitionKo: '뇌실에 생기는 염증입니다.' },
	{ id: 'atrial', parts: ['atri', 'al'], term: 'Atrial', korean: '심방의', systems: ['cardiology'], definition: 'Pertaining to an atrium of the heart.', definitionKo: '심장의 심방에 관한 것을 뜻합니다.' },
	{ id: 'valvulitis', parts: ['valvul', 'itis'], term: 'Valvulitis', korean: '판막염', systems: ['cardiology'], definition: 'Inflammation of a heart valve.', definitionKo: '심장 판막에 생기는 염증입니다.' },
	{ id: 'valvuloplasty', parts: ['valvul', 'plasty'], term: 'Valvuloplasty', korean: '판막성형술', systems: ['cardiology'], definition: 'Surgical repair of a heart valve.', definitionKo: '심장 판막을 외과적으로 복원하는 수술입니다.' },
	{ id: 'septal', parts: ['sept', 'al'], term: 'Septal', korean: '중격의', systems: ['cardiology'], definition: 'Pertaining to a septum, such as the wall between heart chambers.', definitionKo: '심장의 칸 사이 벽 등 중격에 관한 것을 뜻합니다.' },
	{ id: 'septoplasty', parts: ['sept', 'plasty'], term: 'Septoplasty', korean: '중격성형술', systems: ['cardiology'], definition: 'Surgical repair of a septum.', definitionKo: '중격을 외과적으로 교정하는 수술입니다.' },
	{ id: 'aortitis', parts: ['aort', 'itis'], term: 'Aortitis', korean: '대동맥염', systems: ['cardiology'], definition: 'Inflammation of the aorta.', definitionKo: '대동맥에 생기는 염증입니다.' },
	{ id: 'aortic', parts: ['aort', 'ic'], term: 'Aortic', korean: '대동맥의', systems: ['cardiology'], definition: 'Pertaining to the aorta.', definitionKo: '대동맥에 관한 것을 뜻합니다.' },

	// ───────────── 확장 배치 v3: 감염·병리 ─────────────
	{ id: 'viral', parts: ['vir', 'al'], term: 'Viral', korean: '바이러스성의', systems: ['pathology'], definition: 'Caused by or pertaining to a virus.', definitionKo: '바이러스에 의한 또는 바이러스에 관한 것을 뜻합니다.' },
	{ id: 'viremia', parts: ['vir', 'emia'], term: 'Viremia', korean: '바이러스혈증', systems: ['hematology'], definition: 'The presence of viruses in the blood.', definitionKo: '혈액 속에 바이러스가 존재하는 상태입니다.' },
	{ id: 'bacterial', parts: ['bacter', 'al'], term: 'Bacterial', korean: '세균성의', systems: ['pathology'], definition: 'Caused by or pertaining to bacteria.', definitionKo: '세균에 의한 또는 세균에 관한 것을 뜻합니다.' },
	{ id: 'bacteremia', parts: ['bacter', 'emia'], term: 'Bacteremia', korean: '세균혈증', systems: ['hematology'], definition: 'The presence of bacteria in the blood.', definitionKo: '혈액 속에 세균이 존재하는 상태입니다.' },
	{ id: 'parasitic', parts: ['parasit', 'ic'], term: 'Parasitic', korean: '기생충성의', systems: ['pathology'], definition: 'Caused by or pertaining to a parasite.', definitionKo: '기생충에 의한 또는 기생충에 관한 것을 뜻합니다.' },
	{ id: 'parasitology', parts: ['parasit', 'logy'], term: 'Parasitology', korean: '기생충학', systems: ['pathology'], definition: 'The study of parasites.', definitionKo: '기생충을 연구하는 학문입니다.' },
	{ id: 'toxic', parts: ['tox', 'ic'], term: 'Toxic', korean: '독성의', systems: ['pathology'], definition: 'Poisonous; pertaining to a toxin.', definitionKo: '독이 있는, 독소에 관한 것을 뜻합니다.' },
	{ id: 'toxemia', parts: ['tox', 'emia'], term: 'Toxemia', korean: '독혈증', systems: ['pathology'], definition: 'The presence of toxins in the blood.', definitionKo: '혈액 속에 독소가 퍼진 상태입니다.' },

	// ───────────── 확장 배치 v3: 치과·구강·인후 ─────────────
	{ id: 'odontalgia', parts: ['odont', 'algia'], term: 'Odontalgia', korean: '치통', systems: ['gastroenterology'], definition: 'Pain in a tooth; a toothache.', definitionKo: '치아의 통증, 즉 치통입니다.' },
	{ id: 'periodontitis', parts: ['peri', 'odont', 'itis'], term: 'Periodontitis', korean: '치주염', systems: ['gastroenterology'], definition: 'Inflammation of the tissues around the teeth.', definitionKo: '치아 주변 조직에 생기는 염증입니다.' },
	{ id: 'stomatitis', parts: ['stomat', 'itis'], term: 'Stomatitis', korean: '구내염', systems: ['gastroenterology'], definition: 'Inflammation of the mucous lining of the mouth.', definitionKo: '입안 점막에 생기는 염증입니다.' },
	{ id: 'glossitis', parts: ['gloss', 'itis'], term: 'Glossitis', korean: '혀염, 설염', systems: ['gastroenterology'], definition: 'Inflammation of the tongue.', definitionKo: '혀에 생기는 염증입니다.' },
	{ id: 'gingivitis', parts: ['gingiv', 'itis'], term: 'Gingivitis', korean: '치은염, 잇몸염', systems: ['gastroenterology'], definition: 'Inflammation of the gums.', definitionKo: '잇몸에 생기는 염증입니다.' },
	{ id: 'uvulitis', parts: ['uvul', 'itis'], term: 'Uvulitis', korean: '목젖염', systems: ['gastroenterology'], definition: 'Inflammation of the uvula.', definitionKo: '목젖에 생기는 염증입니다.' },
	{ id: 'gastric', parts: ['gastr', 'ic'], term: 'Gastric', korean: '위의', systems: ['gastroenterology'], definition: 'Pertaining to the stomach.', definitionKo: '위(胃)에 관한 것을 뜻합니다.' },
	{ id: 'hepatic', parts: ['hepat', 'ic'], term: 'Hepatic', korean: '간의', systems: ['gastroenterology'], definition: 'Pertaining to the liver.', definitionKo: '간에 관한 것을 뜻합니다.' },

	// ───────────── 확장 배치 v3: 감각(귀·눈) ─────────────
	{ id: 'tympanitis', parts: ['tympan', 'itis'], term: 'Tympanitis', korean: '고막염', systems: ['otology'], definition: 'Inflammation of the eardrum.', definitionKo: '고막에 생기는 염증입니다.' },
	{ id: 'tympanoplasty', parts: ['tympan', 'plasty'], term: 'Tympanoplasty', korean: '고막성형술', systems: ['otology'], definition: 'Surgical repair of the eardrum.', definitionKo: '고막을 외과적으로 복원하는 수술입니다.' },
	{ id: 'tympanic', parts: ['tympan', 'ic'], term: 'Tympanic', korean: '고막의', systems: ['otology'], definition: 'Pertaining to the eardrum.', definitionKo: '고막에 관한 것을 뜻합니다.' },
	{ id: 'iridectomy', parts: ['irid', 'ectomy'], term: 'Iridectomy', korean: '홍채절제술', systems: ['ophthalmology'], definition: 'Surgical removal of part of the iris.', definitionKo: '홍채의 일부를 절제하는 수술입니다.' },
	{ id: 'iridoplegia', parts: ['irid', 'plegia'], term: 'Iridoplegia', korean: '홍채마비', systems: ['ophthalmology'], definition: 'Paralysis of the iris muscles.', definitionKo: '홍채 근육이 마비된 상태입니다.' },
	{ id: 'conjunctivitis', parts: ['conjunctiv', 'itis'], term: 'Conjunctivitis', korean: '결막염', systems: ['ophthalmology'], definition: 'Inflammation of the conjunctiva of the eye.', definitionKo: '눈의 결막에 생기는 염증입니다.' },

	// ───────────── 확장 배치 v3: 척추·근골격 ─────────────
	{ id: 'spondylitis', parts: ['spondyl', 'itis'], term: 'Spondylitis', korean: '척추염', systems: ['musculoskeletal'], definition: 'Inflammation of the vertebrae.', definitionKo: '척추뼈에 생기는 염증입니다.' },
	{ id: 'spondylosis', parts: ['spondyl', 'osis'], term: 'Spondylosis', korean: '척추증', systems: ['musculoskeletal'], definition: 'Degenerative change of the spine.', definitionKo: '척추가 퇴행성으로 변형된 상태입니다.' },
	{ id: 'vertebral', parts: ['vertebr', 'al'], term: 'Vertebral', korean: '척추의', systems: ['musculoskeletal'], definition: 'Pertaining to the vertebrae or spine.', definitionKo: '척추에 관한 것을 뜻합니다.' },
	{ id: 'costal', parts: ['cost', 'al'], term: 'Costal', korean: '늑골의', systems: ['musculoskeletal'], definition: 'Pertaining to the ribs.', definitionKo: '늑골(갈비뼈)에 관한 것을 뜻합니다.' },
	{ id: 'intercostal', parts: ['inter', 'cost', 'al'], term: 'Intercostal', korean: '늑간의', systems: ['musculoskeletal'], definition: 'Located between the ribs.', definitionKo: '늑골 사이에 위치한 것을 뜻합니다.' },
	{ id: 'tendinitis', parts: ['tendin', 'itis'], term: 'Tendinitis', korean: '힘줄염, 건염', systems: ['musculoskeletal'], definition: 'Inflammation of a tendon.', definitionKo: '힘줄(건)에 생기는 염증입니다.' },
	{ id: 'osteogenesis', parts: ['oste', 'genesis'], term: 'Osteogenesis', korean: '골형성', systems: ['musculoskeletal'], definition: 'The formation of bone.', definitionKo: '뼈가 만들어지는 과정입니다.' },

	// ───────────── 확장 배치 v3: 정신·신경 ─────────────
	{ id: 'psychosis', parts: ['psych', 'osis'], term: 'Psychosis', korean: '정신병', systems: ['neurology'], definition: 'A severe mental disorder with loss of contact with reality.', definitionKo: '현실 감각을 잃는 중증 정신 질환입니다.' },
	{ id: 'psychology', parts: ['psych', 'logy'], term: 'Psychology', korean: '심리학', systems: ['neurology'], definition: 'The study of the mind and behavior.', definitionKo: '정신과 행동을 연구하는 학문입니다.' },
	{ id: 'psychopathy', parts: ['psych', 'pathy'], term: 'Psychopathy', korean: '정신병질', systems: ['neurology'], definition: 'A disorder of mind and behavior.', definitionKo: '정신과 행동의 병적 상태입니다.' },

	// ───────────── 확장 배치 v3: 내분비 ─────────────
	{ id: 'thymoma', parts: ['thym', 'oma'], term: 'Thymoma', korean: '흉선종', systems: ['endocrinology'], definition: 'A tumor of the thymus gland.', definitionKo: '흉선(가슴샘)에서 생기는 종양입니다.' },
	{ id: 'thymitis', parts: ['thym', 'itis'], term: 'Thymitis', korean: '흉선염', systems: ['endocrinology'], definition: 'Inflammation of the thymus gland.', definitionKo: '흉선에 생기는 염증입니다.' },
	{ id: 'adrenal', parts: ['adren', 'al'], term: 'Adrenal', korean: '부신의', systems: ['endocrinology'], definition: 'Pertaining to the adrenal gland.', definitionKo: '부신에 관한 것을 뜻합니다.' },
	{ id: 'adrenopathy', parts: ['adren', 'pathy'], term: 'Adrenopathy', korean: '부신병증', systems: ['endocrinology'], definition: 'Any disease of the adrenal gland.', definitionKo: '부신에 생기는 질환을 통칭합니다.' },
	{ id: 'hypercalcemia', parts: ['hyper', 'calc', 'emia'], term: 'Hypercalcemia', korean: '고칼슘혈증', systems: ['endocrinology'], definition: 'An abnormally high level of calcium in the blood.', definitionKo: '혈중 칼슘 농도가 비정상적으로 높은 상태입니다.' },
	{ id: 'hypocalcemia', parts: ['hypo', 'calc', 'emia'], term: 'Hypocalcemia', korean: '저칼슘혈증', systems: ['endocrinology'], definition: 'An abnormally low level of calcium in the blood.', definitionKo: '혈중 칼슘 농도가 비정상적으로 낮은 상태입니다.' },

	// ───────────── 확장 배치 v3: 피부·외피 ─────────────
	{ id: 'xanthoma', parts: ['xanth', 'oma'], term: 'Xanthoma', korean: '황색종', systems: ['dermatology'], definition: 'A yellowish deposit of fat in the skin.', definitionKo: '피부에 지방이 노랗게 침착된 결절입니다.' },
	{ id: 'xanthosis', parts: ['xanth', 'osis'], term: 'Xanthosis', korean: '황색증', systems: ['dermatology'], definition: 'Yellowish discoloration of the skin.', definitionKo: '피부가 노랗게 변색된 상태입니다.' },
	{ id: 'steatosis', parts: ['steat', 'osis'], term: 'Steatosis', korean: '지방증', systems: ['dermatology'], definition: 'Abnormal accumulation of fat in tissue.', definitionKo: '조직에 지방이 비정상적으로 쌓인 상태입니다.' },
	{ id: 'steatoma', parts: ['steat', 'oma'], term: 'Steatoma', korean: '피지낭종', systems: ['dermatology'], definition: 'A cyst filled with sebum.', definitionKo: '피지가 들어찬 낭종입니다.' },
	{ id: 'hyperhidrosis', parts: ['hyper', 'hidr', 'osis'], term: 'Hyperhidrosis', korean: '다한증', systems: ['dermatology'], definition: 'Excessive sweating.', definitionKo: '땀이 과도하게 나는 상태입니다.' },
	{ id: 'trichosis', parts: ['trich', 'osis'], term: 'Trichosis', korean: '모발증', systems: ['dermatology'], definition: 'Any abnormal condition of the hair.', definitionKo: '모발의 비정상 상태를 통칭합니다.' },

	// ───────────── 확장 배치 v3: 병리(발생) ─────────────
	{ id: 'carcinogenesis', parts: ['carcin', 'genesis'], term: 'Carcinogenesis', korean: '발암', systems: ['pathology'], definition: 'The process by which cancer develops.', definitionKo: '암이 생겨나는 과정입니다.' },

	// ───────────── 확장 배치 v4: NBK 어근을 쓰는 용어 ─────────────
	{ id: 'abdominal', parts: ['abdomin', 'al'], term: 'Abdominal', korean: '복부의', systems: ['anatomy'], definition: 'Pertaining to the abdomen.', definitionKo: '복부(배)에 관한 것을 뜻합니다.' },
	{ id: 'abdominocentesis', parts: ['abdomin', 'centesis'], term: 'Abdominocentesis', korean: '복부천자', systems: ['gastroenterology'], definition: 'Surgical puncture of the abdomen to withdraw fluid.', definitionKo: '복강에 바늘을 찔러 체액을 뽑는 시술입니다.' },
	{ id: 'andrology', parts: ['andr', 'logy'], term: 'Andrology', korean: '남성의학', systems: ['andrology'], definition: 'The study of male health and the male reproductive system.', definitionKo: '남성 건강과 남성 생식계통을 다루는 분야입니다.' },
	{ id: 'audiology', parts: ['audi', 'logy'], term: 'Audiology', korean: '청각학', systems: ['otology'], definition: 'The study of hearing and hearing disorders.', definitionKo: '청각과 청각 장애를 연구하는 분야입니다.' },
	{ id: 'optic', parts: ['opt', 'ic'], term: 'Optic', korean: '시각의, 시신경의', systems: ['ophthalmology'], definition: 'Pertaining to vision or the eye.', definitionKo: '시각이나 눈에 관한 것을 뜻합니다.' },
	{ id: 'histology', parts: ['hist', 'logy'], term: 'Histology', korean: '조직학', systems: ['pathology'], definition: 'The study of the microscopic structure of tissues.', definitionKo: '조직의 미세 구조를 연구하는 학문입니다.' },
	{ id: 'duodenitis', parts: ['duoden', 'itis'], term: 'Duodenitis', korean: '십이지장염', systems: ['gastroenterology'], definition: 'Inflammation of the duodenum.', definitionKo: '십이지장에 생기는 염증입니다.' },
	{ id: 'duodenal', parts: ['duoden', 'al'], term: 'Duodenal', korean: '십이지장의', systems: ['gastroenterology'], definition: 'Pertaining to the duodenum.', definitionKo: '십이지장에 관한 것을 뜻합니다.' },
	{ id: 'esophagitis', parts: ['esophag', 'itis'], term: 'Esophagitis', korean: '식도염', systems: ['gastroenterology'], definition: 'Inflammation of the esophagus.', definitionKo: '식도에 생기는 염증입니다.' },
	{ id: 'esophagoscopy', parts: ['esophag', 'scopy'], term: 'Esophagoscopy', korean: '식도경검사', systems: ['gastroenterology'], definition: 'Visual examination of the esophagus with a scope.', definitionKo: '식도경으로 식도를 들여다보는 검사입니다.' },
	{ id: 'esophagectomy', parts: ['esophag', 'ectomy'], term: 'Esophagectomy', korean: '식도절제술', systems: ['gastroenterology'], definition: 'Surgical removal of all or part of the esophagus.', definitionKo: '식도의 전체 또는 일부를 절제하는 수술입니다.' },
	{ id: 'cardiac', parts: ['cardi', 'ac'], term: 'Cardiac', korean: '심장의', systems: ['cardiology'], definition: 'Pertaining to the heart.', definitionKo: '심장에 관한 것을 뜻합니다.' },

	// ───────────── 확장 배치 v4: 접두사를 쓰는 용어 ─────────────
	{ id: 'antenatal', parts: ['ante', 'nat', 'al'], term: 'Antenatal', korean: '산전의, 출생전의', systems: ['obstetrics'], definition: 'Occurring before birth.', definitionKo: '출생 전에 일어나는 것을 뜻합니다.' },
	{ id: 'antitoxic', parts: ['anti', 'tox', 'ic'], term: 'Antitoxic', korean: '항독성의', systems: ['pathology'], definition: 'Counteracting a toxin.', definitionKo: '독소에 대항하는 성질을 뜻합니다.' },
	{ id: 'diarrhea', parts: ['dia', 'rrhea'], term: 'Diarrhea', korean: '설사', systems: ['gastroenterology'], definition: 'Frequent loose or watery bowel movements.', definitionKo: '묽은 변을 자주 보는 증상입니다.' },
	{ id: 'transdermal', parts: ['trans', 'derm', 'al'], term: 'Transdermal', korean: '경피의', systems: ['dermatology'], definition: 'Passing through the skin.', definitionKo: '피부를 통해 전달되는 것을 뜻합니다.' },
	{ id: 'transurethral', parts: ['trans', 'urethr', 'al'], term: 'Transurethral', korean: '경요도의', systems: ['nephrology'], definition: 'Performed through the urethra.', definitionKo: '요도를 통해 시행하는 것을 뜻합니다.' },
	{ id: 'paracentesis', parts: ['para', 'centesis'], term: 'Paracentesis', korean: '천자(복강천자)', systems: ['gastroenterology'], definition: 'Surgical puncture of a cavity to withdraw fluid.', definitionKo: '체강에 바늘을 찔러 고인 체액을 뽑는 시술입니다.' },
	{ id: 'contralateral', parts: ['contra', 'later', 'al'], term: 'Contralateral', korean: '반대측의', systems: ['anatomy'], definition: 'Pertaining to the opposite side.', definitionKo: '반대쪽에 관한 것을 뜻합니다.' },
	{ id: 'extrahepatic', parts: ['extra', 'hepat', 'ic'], term: 'Extrahepatic', korean: '간외의', systems: ['gastroenterology'], definition: 'Located or occurring outside the liver.', definitionKo: '간 바깥에 있거나 일어나는 것을 뜻합니다.' },
	{ id: 'macroglossia', parts: ['macro', 'gloss', 'ia'], term: 'Macroglossia', korean: '큰혀증, 거대설', systems: ['gastroenterology'], definition: 'Abnormal enlargement of the tongue.', definitionKo: '혀가 비정상적으로 커진 상태입니다.' },
	{ id: 'microcephalic', parts: ['micro', 'cephal', 'ic'], term: 'Microcephalic', korean: '소두증의', systems: ['neurology'], definition: 'Having an abnormally small head.', definitionKo: '머리가 비정상적으로 작은 것을 뜻합니다.' },
	{ id: 'monocyte', parts: ['mono', 'cyt'], term: 'Monocyte', korean: '단핵구', systems: ['hematology'], definition: 'A type of large white blood cell with a single nucleus.', definitionKo: '핵이 하나인 큰 백혈구의 한 종류입니다.' },
	{ id: 'multicystic', parts: ['multi', 'cyst', 'ic'], term: 'Multicystic', korean: '다낭성의', systems: ['pathology'], definition: 'Containing many cysts.', definitionKo: '여러 개의 낭종을 가진 것을 뜻합니다.' },
	{ id: 'unilateral', parts: ['uni', 'later', 'al'], term: 'Unilateral', korean: '편측의, 한쪽의', systems: ['anatomy'], definition: 'Affecting or occurring on one side only.', definitionKo: '한쪽에만 일어나는 것을 뜻합니다.' },
	{ id: 'quadriplegia', parts: ['quadri', 'plegia'], term: 'Quadriplegia', korean: '사지마비', systems: ['neurology'], definition: 'Paralysis of all four limbs.', definitionKo: '팔다리 네 곳이 모두 마비된 상태입니다.' },
	{ id: 'pancytopenia', parts: ['pan', 'cyt', 'penia'], term: 'Pancytopenia', korean: '범혈구감소증', systems: ['hematology'], definition: 'A deficiency of all blood cell types.', definitionKo: '모든 혈구 수가 감소한 상태입니다.' },
	{ id: 'pseudocyst', parts: ['pseudo', 'cyst'], term: 'Pseudocyst', korean: '가성낭종', systems: ['pathology'], definition: 'A fluid collection resembling a cyst but lacking a true lining.', definitionKo: '진짜 낭종과 비슷하지만 내벽이 없는 체액 주머니입니다.' },
	{ id: 'orthopnea', parts: ['ortho', 'pnea'], term: 'Orthopnea', korean: '좌위호흡, 기좌호흡', systems: ['pulmonology'], definition: 'Difficulty breathing while lying flat, relieved by sitting up.', definitionKo: '누우면 숨쉬기 어렵고 앉으면 편해지는 호흡 곤란입니다.' },
	{ id: 'infracostal', parts: ['infra', 'cost', 'al'], term: 'Infracostal', korean: '늑골하의', systems: ['musculoskeletal'], definition: 'Located below a rib.', definitionKo: '늑골 아래에 위치한 것을 뜻합니다.' }
];

export const terms: MedicalTerm[] = rawTerms.map((t) => {
	const ms = t.parts.map((id) => morphemeById[id]).filter((m): m is Morpheme => !!m);
	return {
		...t,
		category: t.systems[0],
		morphemes: ms,
		etymology: ms.map(toEtymologyPart)
	};
});

export const termById: Record<string, MedicalTerm> = Object.fromEntries(terms.map((t) => [t.id, t]));

/** 데일리 학습 풀에 들어가는 용어 — 강의 toggle OFF인 lecture-only term은 제외.
 *  도감(/dex)은 전체 노출, 학습 큐·진척 통계는 이 함수를 통해 필터. */
export function dailyPoolTerms(): MedicalTerm[] {
	return terms.filter((t) => isFromActiveLecture(t.fromLectures));
}

/** 이 morpheme id를 쓰는 용어들. */
export function termsUsingMorpheme(morphemeId: string): MedicalTerm[] {
	return terms.filter((t) => t.parts.includes(morphemeId));
}

/** "친숙" morpheme id 집합으로 → 모든 조각이 친숙해서 읽히는 용어 id 집합. */
export function unlockedTermIds(collected: Iterable<string>): Set<string> {
	const c = collected instanceof Set ? (collected as Set<string>) : new Set(collected);
	return new Set(terms.filter((t) => t.parts.every((p) => c.has(p))).map((t) => t.id));
}

/** 디코딩(②)용 큐 분류 — PRD: "부분 어근이 이미 친숙한 용어 우선" → 레버리지 체감.
 *   A = 모든 어근 친숙 (해금된 용어)
 *   B = 1개 어근만 신규 ("아는 조각 ⊂ 그물", 같이 익히기 좋음)
 *   C = 2개+ 신규 (큐 뒤로 — 디코딩 부담 큼)
 */
export type DecodingTier = 'A' | 'B' | 'C';
export interface DecodingCandidate {
	term: MedicalTerm;
	tier: DecodingTier;
	newRoots: string[];
}
const TIER_ORDER: Record<DecodingTier, number> = { A: 0, B: 1, C: 2 };
export function decodingQueue(collected: Iterable<string>): DecodingCandidate[] {
	const c = collected instanceof Set ? (collected as Set<string>) : new Set(collected);
	return terms
		.filter((t) => t.parts.length > 0 && t.parts.every((p) => morphemeById[p]))
		.map((t) => {
			const newRoots = t.parts.filter((p) => !c.has(p));
			const tier: DecodingTier = newRoots.length === 0 ? 'A' : newRoots.length === 1 ? 'B' : 'C';
			return { term: t, tier, newRoots };
		})
		.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
}
