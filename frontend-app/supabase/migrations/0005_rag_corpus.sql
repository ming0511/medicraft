-- MediCraft Pro: 수확 에이전트 RAG 코퍼스 (어원 출처 대조)
-- 강의 추출 ③단계 "NBK 대조"를 정확매칭 → 벡터 의미검색(RAG)으로 승격.
-- 어근/어구를 임베딩해 신뢰 출처(NBK OER, CC-BY) 코퍼스에서 top-k 구절을 끌어와 citation 부착.
-- Supabase 대시보드 SQL Editor 에 붙여넣고 실행 (0001~0004 이후).
--
-- 임베딩: Gemini gemini-embedding-001, outputDimensionality=768.
-- 코퍼스는 오프라인 스크립트(scripts/embed-corpus.mjs)가 채움 → 런타임은 쿼리만 임베딩.
-- 서버(service_role)만 접근. RLS 켜고 정책 없음 = service_role 외 차단.

create extension if not exists vector;

create table if not exists public.nbk_corpus (
	id          text primary key,            -- 출처 조각 고유 id (예: 'nbk-ch1:root:hepat')
	surface     text not null,               -- 정규화된 표면형 (예: 'hepat/o')
	bucket      text,                         -- 'prefix' | 'root' | 'suffix'
	meaning     text,                         -- 출처가 기술한 뜻 (영문 원문)
	source      text not null,               -- 출처 라벨 (예: 'NBK<id> ch.1')
	citation    text,                         -- 사람이 읽는 인용 + URL
	content     text not null,               -- 임베딩 대상 텍스트 (surface + meaning + 맥락)
	embedding   vector(768) not null,
	created_at  timestamptz not null default now()
);

-- 코사인 거리 근사 인덱스 (768차원 < 2000 → ivfflat OK).
create index if not exists nbk_corpus_embedding_idx
	on public.nbk_corpus using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.nbk_corpus enable row level security;
-- 정책 없음 = authenticated/anon 차단. 서버(service_role)만 접근.
-- ⚠️ service_role 은 RLS 는 우회하지만 테이블 GRANT 는 필요 → 명시적으로 부여.
grant select, insert, update, delete on public.nbk_corpus to service_role;

-- ── 유사도 검색 RPC ───────────────────────────────────────
-- query_embedding 과 가장 가까운 top-k 를 코사인 유사도(1 - 거리)로 반환.
create or replace function public.match_nbk(
	query_embedding vector(768),
	match_count int default 5
)
returns table (
	id text,
	surface text,
	bucket text,
	meaning text,
	source text,
	citation text,
	similarity float
)
language sql stable
as $$
	select
		c.id,
		c.surface,
		c.bucket,
		c.meaning,
		c.source,
		c.citation,
		1 - (c.embedding <=> query_embedding) as similarity
	from public.nbk_corpus c
	order by c.embedding <=> query_embedding
	limit match_count;
$$;
