--
-- PostgreSQL database dump
--

\restrict IoUIDbKZqpamfmXM14NG6UsjsKzad9Yynjn2N8HdINFfPfqQiRpmvcZo3gkEDFl

-- Dumped from database version 18.6 (fd34222)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _articles_v; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._articles_v (
    id integer NOT NULL,
    parent_id integer,
    version_title character varying,
    version_title_en character varying,
    version_excerpt character varying,
    version_body jsonb,
    version_layout public.enum__articles_v_version_layout DEFAULT 'standard'::public.enum__articles_v_version_layout,
    version_video_provider public.enum__articles_v_version_video_provider DEFAULT 'youtube'::public.enum__articles_v_version_video_provider,
    version_video_url character varying,
    version_subcategory_id integer,
    version_university_id integer,
    version_is_breaking boolean DEFAULT false,
    version_is_lead boolean DEFAULT false,
    version_is_sponsored boolean DEFAULT false,
    version_sponsor_name character varying,
    version_correction_notice_has_correction boolean DEFAULT false,
    version_correction_notice_note character varying,
    version_slug character varying,
    version_featured_image_id integer,
    version_category_id integer,
    version_author_id integer,
    version_review_status public.enum__articles_v_version_review_status DEFAULT 'draft'::public.enum__articles_v_version_review_status,
    version_review_note character varying,
    version_published_at timestamp(3) with time zone,
    version_reading_time_minutes numeric,
    version_updated_at timestamp(3) with time zone,
    version_created_at timestamp(3) with time zone,
    version__status public.enum__articles_v_version_status DEFAULT 'draft'::public.enum__articles_v_version_status,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    latest boolean,
    autosave boolean
);


--
-- Name: _articles_v_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._articles_v_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _articles_v_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._articles_v_id_seq OWNED BY public._articles_v.id;


--
-- Name: _articles_v_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._articles_v_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    levels_id integer,
    districts_id integer,
    tags_id integer
);


--
-- Name: _articles_v_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._articles_v_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _articles_v_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._articles_v_rels_id_seq OWNED BY public._articles_v_rels.id;


--
-- Name: _articles_v_version_key_takeaways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._articles_v_version_key_takeaways (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id integer NOT NULL,
    point character varying,
    _uuid character varying
);


--
-- Name: _articles_v_version_key_takeaways_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._articles_v_version_key_takeaways_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _articles_v_version_key_takeaways_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._articles_v_version_key_takeaways_id_seq OWNED BY public._articles_v_version_key_takeaways.id;


--
-- Name: _articles_v_version_photo_story; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._articles_v_version_photo_story (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id integer NOT NULL,
    image_id integer,
    caption character varying,
    credit character varying,
    full_bleed boolean DEFAULT false,
    _uuid character varying
);


--
-- Name: _articles_v_version_photo_story_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._articles_v_version_photo_story_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _articles_v_version_photo_story_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._articles_v_version_photo_story_id_seq OWNED BY public._articles_v_version_photo_story.id;


--
-- Name: _articles_v_version_timeline_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._articles_v_version_timeline_milestones (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id integer NOT NULL,
    date timestamp(3) with time zone,
    title character varying,
    detail character varying,
    _uuid character varying
);


--
-- Name: _articles_v_version_timeline_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._articles_v_version_timeline_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _articles_v_version_timeline_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._articles_v_version_timeline_milestones_id_seq OWNED BY public._articles_v_version_timeline_milestones.id;


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id integer NOT NULL,
    title character varying,
    title_en character varying,
    excerpt character varying,
    body jsonb,
    layout public.enum_articles_layout DEFAULT 'standard'::public.enum_articles_layout,
    video_provider public.enum_articles_video_provider DEFAULT 'youtube'::public.enum_articles_video_provider,
    video_url character varying,
    subcategory_id integer,
    university_id integer,
    is_breaking boolean DEFAULT false,
    is_lead boolean DEFAULT false,
    is_sponsored boolean DEFAULT false,
    sponsor_name character varying,
    correction_notice_has_correction boolean DEFAULT false,
    correction_notice_note character varying,
    slug character varying,
    featured_image_id integer,
    category_id integer,
    author_id integer,
    review_status public.enum_articles_review_status DEFAULT 'draft'::public.enum_articles_review_status,
    review_note character varying,
    published_at timestamp(3) with time zone,
    reading_time_minutes numeric,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    _status public.enum_articles_status DEFAULT 'draft'::public.enum_articles_status
);


--
-- Name: articles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- Name: articles_key_takeaways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles_key_takeaways (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    point character varying
);


--
-- Name: articles_photo_story; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles_photo_story (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    image_id integer,
    caption character varying,
    credit character varying,
    full_bleed boolean DEFAULT false
);


--
-- Name: articles_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    levels_id integer,
    districts_id integer,
    tags_id integer
);


--
-- Name: articles_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.articles_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: articles_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.articles_rels_id_seq OWNED BY public.articles_rels.id;


--
-- Name: articles_timeline_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles_timeline_milestones (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    date timestamp(3) with time zone,
    title character varying,
    detail character varying
);


--
-- Name: _articles_v id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v ALTER COLUMN id SET DEFAULT nextval('public._articles_v_id_seq'::regclass);


--
-- Name: _articles_v_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_rels ALTER COLUMN id SET DEFAULT nextval('public._articles_v_rels_id_seq'::regclass);


--
-- Name: _articles_v_version_key_takeaways id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_key_takeaways ALTER COLUMN id SET DEFAULT nextval('public._articles_v_version_key_takeaways_id_seq'::regclass);


--
-- Name: _articles_v_version_photo_story id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_photo_story ALTER COLUMN id SET DEFAULT nextval('public._articles_v_version_photo_story_id_seq'::regclass);


--
-- Name: _articles_v_version_timeline_milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_timeline_milestones ALTER COLUMN id SET DEFAULT nextval('public._articles_v_version_timeline_milestones_id_seq'::regclass);


--
-- Name: articles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- Name: articles_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_rels ALTER COLUMN id SET DEFAULT nextval('public.articles_rels_id_seq'::regclass);


--
-- Data for Name: _articles_v; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._articles_v (id, parent_id, version_title, version_title_en, version_excerpt, version_body, version_layout, version_video_provider, version_video_url, version_subcategory_id, version_university_id, version_is_breaking, version_is_lead, version_is_sponsored, version_sponsor_name, version_correction_notice_has_correction, version_correction_notice_note, version_slug, version_featured_image_id, version_category_id, version_author_id, version_review_status, version_review_note, version_published_at, version_reading_time_minutes, version_updated_at, version_created_at, version__status, created_at, updated_at, latest, autosave) FROM stdin;
2	2	আত্মপ্রকাশ করল — শিক্ষা২৪	\N	আজ শিক্ষা২৪ পৃথিবীর ডিজিটাল জগতে তার প্রথম পদচিহ্ন রাখল। আগামী দিনে এই পদচিহ্ন হয়ে উঠুক হাজারো শিক্ষার্থীর স্বপ্নপূরণের পথ।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "পৃথিবীর ডিজিটাল আকাশে নতুন এক আবির্ভাব… অসংখ্য স্বপ্ন, অগণিত সম্ভাবনা আর শিক্ষার্থীদের ভবিষ্যতের পথচলাকে আরও সহজ করার প্রত্যয় নিয়ে— আত্মপ্রকাশ করল — শিক্ষা২৪ (Shikkha24.com) এটি শুধু একটি ওয়েবসাইট নয়; এটি স্বপ্ন দেখা শিক্ষার্থীদের জন্য তথ্য, সুযোগ ও সম্ভাবনার একটি নতুন ঠিকানা। একটি সঠিক তথ্য, একটি সময়োপযোগী সিদ্ধান্ত, একটি স্কলারশিপের সুযোগ— বদলে দিতে পারে একজন শিক্ষার্থীর পুরো ভবিষ্যৎ। সেই বিশ্বাস থেকেই আমাদের পথচলা— শিক্ষার খবর ভবিষ্যতের সুযোগ বিশ্বের উচ্চশিক্ষার দুয়ার স্কলারশিপ ও ক্যারিয়ারের সম্ভাবনা সবকিছু এক প্ল্যাটফর্মে। আজ শিক্ষা২৪ পৃথিবীর ডিজিটাল জগতে তার প্রথম পদচিহ্ন রাখল। আগামী দিনে এই পদচিহ্ন হয়ে উঠুক হাজারো শিক্ষার্থীর স্বপ্নপূরণের পথ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	8	\N	t	t	f	\N	f	\N	post-ujepgq	\N	8	1	approved	\N	2026-10-18 04:51:46.093+00	1	2026-10-27 06:35:01.326+00	2026-10-27 06:35:01.326+00	published	2026-10-27 06:35:01.436+00	2026-10-27 06:35:01.436+00	t	f
3	3	একাদশ শ্রেণিতে ভর্তি হতে তৃতীয় ধাপে আবেদনের সুযোগ	\N	ভর্তি	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "২০২৬-২৭ শিক্ষাবর্ষে একাদশ শ্রেণিতে ভর্তির সর্বশেষ বা তৃতীয় ধাপের বিস্তারিত সময়সূচি", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " এবং গুরুত্বপূর্ণ নিয়মাবলি নিচে দেওয়া হলো", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 1}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "📅 গুরুত্বপূর্ণ সময়সূচি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"tag": "ul", "type": "list", "start": 1, "format": "", "indent": 0, "version": 1, "children": [{"type": "listitem", "value": 1, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "অনলাইন আবেদন:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ২৬ অক্টোবর থেকে ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "২৭ অক্টোবর ২০২৬ রাত ৮টা পর্যন্ত", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 2, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফল প্রকাশ:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "৩০ অক্টোবর ২০২৬ রাত ৮টায়", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 3, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সিলেকশন নিশ্চায়ন:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ৩০ অক্টোবর ফল প্রকাশের পর থেকে ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "৩১ অক্টোবর রাত ৮টা পর্যন্ত", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "। (এই সময়ের মধ্যে নিশ্চায়ন না করলে আবেদন ও নির্বাচন বাতিল হয়ে যাবে)।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 4, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মাইগ্রেশনের ফল প্রকাশ:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "১ নভেম্বর ২০২৬ রাত ৮টায়", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 5, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "চূড়ান্ত ভর্তি:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "২ ও ৩ নভেম্বর ২০২৬", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}], "listType": "bullet", "textFormat": 1}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "📋 আবেদনের নিয়ম ও শর্তাবলি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"tag": "ul", "type": "list", "start": 1, "format": "", "indent": 0, "version": 1, "children": [{"type": "listitem", "value": 1, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কারা আবেদন করতে পারবে:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " যারা আগে আবেদন করেনি, আবেদন করেও কোনো কলেজ পায়নি, চূড়ান্ত মনোনয়ন পেয়েও নিশ্চায়ন করতে পারেনি, নির্ধারিত সময়ে ভর্তি হতে পারেনি অথবা ভুল কোটার কারণে ভর্তি বাতিল হয়েছে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 2, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আগের নিশ্চায়ন বাতিল:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " পূর্বে নিশ্চায়নকৃত কোনো শিক্ষার্থী যদি এই ধাপে নতুন করে আবেদন করতে চায়, তবে ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "২৭ অক্টোবর ২০২৬ বিকেল ৪টার মধ্যে", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " নিজ বোর্ডে সশরীরে উপস্থিত হয়ে আগের নিশ্চায়ন বাতিল করতে হবে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 3, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আবেদন ফি:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " যারা ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "দ্বিতীয় ধাপে আবেদন করেও কোনো কলেজ পায়নি", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": ", তাদের এই তৃতীয় ধাপে নতুন করে কোনো আবেদন ফি (২২০ টাকা) দিতে হবে না। তারা শুধু ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"id": "6ad44f418c981107c78a26e7", "type": "link", "fields": {"url": "https://xiclassadmission.gov.bd/", "newTab": true, "linkType": "custom"}, "format": "", "indent": 0, "version": 3, "children": [{"mode": "normal", "text": "একাদশ শ্রেণি ভর্তির অফিসিয়াল ওয়েবসাইট", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": "-এ লগইন করে নতুন করে কলেজ পছন্দক্রম দিলেই চলবে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 4, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কলেজ সংখ্যা:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " শিক্ষার্থীদের বিদ্যমান শূন্য আসন দেখে সর্বনিম্ন ৫টি এবং সর্বোচ্চ ১০টি কলেজের পছন্দক্রম দিয়ে আবেদন করতে হবে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}], "listType": "bullet", "textFormat": 1}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "এই ভর্তি প্রক্রিয়া সংক্রান্ত কোনো নির্দিষ্ট কলেজ বা পছন্দক্রম পরিবর্তন নিয়ে আপনার আর কোনো ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "তথ্য জানার আছে কি?", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " আমি আপনাকে পরবর্তী ধাপে সাহায্য করতে পারি।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	6	\N	t	t	f	\N	f	\N	post-n2fili	\N	6	1	approved	\N	2026-10-18 04:45:08.412+00	1	2026-10-27 06:35:01.754+00	2026-10-27 06:35:01.754+00	published	2026-10-27 06:35:01.93+00	2026-10-27 06:35:01.93+00	t	f
4	4	একনজরে এই সপ্তাহের শিক্ষা সংবাদ: ফলাফল থেকে বৃত্তি — ৭টি আপডেট একসাথে	\N	৭টি বড় শিক্ষা আপডেট এক ক্লিকে: মাউশির ব্যাংক হিসাব সংশোধন, HSC ফলাফলের সম্ভাব্য দিন, ৪৫তম বিসিএস ক্যাডার, জাবি ভর্তির সময়সূচি, স্কুল ভর্তি নীতিমালা, মাদ্রাসা বৃত্তির কেন্দ্রতালিকা ও জাবি মাস্টার্সের আবেদন।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৭ দিনে শিক্ষাঙ্গনে যা ঘুরেছে: বিসিএস ক্যাডার প্রজ্ঞাপন, HSC-র ফলাফলের আঁচ আর স্কুলে ভর্তির নীতিমাল। এক জায়গায় সব, প্রতিটির পেছনে আমাদের পূর্ণ প্রতিবেদন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বৃত্তি ও ব্যাংক হিসাব", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ইবতেদায়ি ৫ম ও দাখিল ৮ম বৃত্তি পরীক্ষার ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/scholarship/25/madrasah-scholarship-exam-centres-2026", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কেন্দ্রতালিকা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " প্রকাশ পেয়েছে; সংশোধনীর শেষ সময় ১৭ অক্টোবর।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফলাফল ও পরীক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "এইচএসসির ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/education-news/27/hsc-result-2026-possible-date", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফলাফল সম্ভাব্য ২৫–২৯ অক্টোবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " — ১২ লাখ ৭০ হাজার পরীক্ষার্থীর জন্য এই সপ্তাহটাই সিদ্ধান্তের।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৪৫তম ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/jobs-career/24/45th-bcs-appointment-notice", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বিসিএসের প্রজ্ঞাপন", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " জারি: ১ হাজার ৭০২ প্রার্থী ক্যাডারে, যোগদানের শেষ ১ নভেম্বর।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তি ও নীতিমালা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাবি ভর্তি পরীক্ষা প্রাথমিকভাবে ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/admission/28/ju-admission-exam-2026-27", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "১৭–২৮ জানুয়ারি", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " — চূড়ান্ত প্রজ্ঞাপন ২৮ অক্টোবরে; বিভাগীয় শহরের সুযোগ নিয়ে প্রশ্ন থেকেই গেল।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সরকারি স্কুলে ভর্তির ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/admission/23/admission-policy-2027", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "নীতিমালা-২০২৭", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " প্রকাশ: ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাতীয় বিশ্ববিদ্যালয়ের নিয়মিত ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/university/26/nu-masters-admission-2024-25", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মাস্টার্সে আবেদন", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " শুরু — ফরমপূরণ ১৫ নভেম্বর পর্যন্ত।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "প্রতিটি প্রতিবেদন নিয়মিত হালনাগাদ হয়। সপ্তাহজুড়ে নতুন সংবাদের জন্য ফলো করুন ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/latest", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা২৪.কম — লেটেস্ট", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " পাতায়।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	t	১৮ অক্টোবর সংশোধন: এই সংকলনের আগের সংস্করণে মাউশি বৃত্তির ব্যাংক হিসাব সংশোধন সংক্রান্ত একটি অনুচ্ছেদ ছিল, যার পূর্ণ প্রতিবেদন এখনো প্রকাশিত হয়নি। যাচাইযোগ্য সূত্র ছাড়া দাবি রাখা আমাদের নীতির বাইরে, তাই অনুচ্ছেদটি সরিয়ে নেওয়া হয়েছে। প্রতিবেদনটি প্রকাশ হলে এখানে যুক্ত করা হবে।	weekly-digest-2026-10-17	\N	8	1	approved	\N	2026-10-17 22:20:20+00	1	2026-10-27 06:35:02.281+00	2026-10-27 06:35:02.281+00	published	2026-10-27 06:35:02.448+00	2026-10-27 06:35:02.448+00	t	f
5	5	জাবি ভর্তি পরীক্ষা প্রাথমিকভাবে ১৭–২৮ জানুয়ারি — বিভাগীয় শহরের আশা শেষ? চূড়ান্ত ২৮ অক্টোবরে	\N	জাহাঙ্গীরনগর বিশ্ববিদ্যালয়ের ২০২৬-২৭ শিক্ষাবর্ষের ভর্তি পরীক্ষা ১৭–২৮ জানুয়ারির মধ্যে নেওয়ার প্রাথমিক পরিকল্পনা; চূড়ান্ত হবে ২৮ অক্টোবরের বৈঠকে।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জানুয়ারির পরিকল্পনায় কী আছে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৮ জুলাই গঠিত চারটি উপকমিটি প্রতিবেদন দিয়েছে — এবারও বিভাগীয় পর্যায়ে পরীক্ষা না নেওয়ার পক্ষে। শুনে হতাশ হবেন যাঁরা সাভার না গিয়ে নিজের শহরে পরীক্ষা দিতে চেয়েছিলেন: বাধাগুলো হলো খরচ, আর অন্য বিশ্ববিদ্যালয়ের ভর্তি পরীক্ষার তারিখের সঙ্গে সামঞ্জস্য। তার মানে জাবির পরীক্ষা-কেন্দ্র আবারো থাকবে ক্যাম্পাসকেন্দ্রিক।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কখন স্থির হবে সব", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব মিলবে ২৮ অক্টোবরের ভর্তি পরীক্ষা কমিটির বৈঠকে — সেখানেই পরীক্ষার তারিখ ও সময়সীমা চূড়ান্ত হবে। প্রতিবেদনটি হালনাগাদ হয়েছে ১৫ অক্টোবরে, তাই এটাই সবচেয়ে টাটকা চিত্র। আবেদন শুরুর তারিখ, ফি, মার্কিং স্কিম — বৈঠকের পরেই যা যা স্পষ্ট হচ্ছে, শিক্ষা২৪ তার ধাপে ধাপে ভাঙলে রাখব এখানে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাবি টার্গেট করা শিক্ষার্থীদের বলি — যাতায়াত-থাকার হিসাবটা ডিসেম্বরের মধ্যেই করে ফেলুন, ধরে নিন কেন্দ্র ঢাকার রাস্তার ওপাশে সাভারে। আর প্রস্তুতির প্রাথমিক সময়সীমা ধরুন ১৭ জানুয়ারি। ২৮ অক্টোবরের বৈঠকের খবর পরিষ্কার হলে আমরা তোলা রাখব — আবেদনের টাইমলাইনসহ।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.prothomalo.com/education/admission/bluk8d16uu", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "প্রথম আলো", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	t	t	f	\N	f	\N	ju-admission-exam-2026-27	13	6	1	approved	\N	2026-10-15 22:36:54.1+00	1	2026-10-27 06:35:02.8+00	2026-10-27 06:35:02.8+00	published	2026-10-27 06:35:03.031+00	2026-10-27 06:35:03.031+00	t	f
6	6	এইচএসসি ফলাফল সম্ভাব্য ২৫–২৯ অক্টোবর — ১২ লাখ ৭০ হাজার পরীক্ষার্থীর ধৈর্য্যের হিসাব	\N	এইচএসসি ও সমমানের ফলাফল ২০২৬ প্রকাশের সম্ভাব্য জানালা ২৫–২৯ অক্টোবর, জানিয়েছে বোর্ড সমন্বয় কমিটি। পরীক্ষার্থী সাড়ে ১২ লাখ — সর্বশেষ হালনাগাদ।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তারিখ কেন এগিয়ে আসছে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আগের পরিকল্পনায় ফল প্রকাশের জানালা ছিল ১ থেকে ১৫ নভেম্বর। এখন সেটা এগিয়ে আসছে — কারণ তিন বোর্ডের বাকি কাজ পথ পেয়েছে। বন্যার কারণে পেছানো চট্টগ্রাম বোর্ডের পরীক্ষা শেষ হয়েছিল ৯ সেপ্টেম্বরে; ওই বোর্ডের পাশাপাশি মাদ্রাসা ও কারিগরি শিক্ষা বোর্ডের খাতা দেখার কাজও এখন শেষ সীমায়। সব খাতা জমা পড়লে ফল প্রকাশনার বিভাগ তারিখ বসাবে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "এবারের হিসাবটা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৯টি সাধারণ শিক্ষা বোর্ড, মাদ্রাসা আর কারিগরি শিক্ষা বোর্ড মিলিয়ে নিবন্ধিত পরীক্ষার্থী ১২ লাখ ৭০ হাজার ৫৮৩ জন। পরীক্ষা শুরু হয়েছিল ২ জুলাই, মূল পর্ব শেষ ৮ আগস্টে। দুই মাসের অপেক্ষা তো এখন জমেছে — আর ফলের পর সামনে বিশ্ববিদ্যালয় ভর্তির মৌসুম, তাই এই এক সপ্তাহটা কাউকে নিশ্চিহ্ন ব্যবধান দিচ্ছে না।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "২৫–২৯ অক্টোবর ধরে সাজে চকচকে — তবে চূড়ান্ত তারিখ বোর্ড ঘোষণা করলে তবেই প্যাকেট। ফল প্রকাশের দিনের সকালে এই পাতাতেই পাবেন ওয়েবসাইট-এসএমএস দিয়ে রেজাল্ট দেখার ধাপে ধাপে নিয়ম, প্রতিটি বোর্ডের লিংকসহ। স্কুল-পত্র ওঠার আগে কোনো 'লিকড' তালিকায় টাকা না শোধরিয়ে অপেক্ষা করুন — মিথ্যা বিভ্রান্তি প্রতিবছরই ছড়ায়।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/hsc-results-in-the-last-week-of-this-month-387347", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	hsc-result-2026-possible-date	14	8	1	approved	\N	2026-10-15 22:36:54.002+00	1	2026-10-27 06:35:03.434+00	2026-10-27 06:35:03.434+00	published	2026-10-27 06:35:03.655+00	2026-10-27 06:35:03.655+00	t	f
7	7	এনইউ নিয়মিত মাস্টার্সে আবেদন শুরু — ফরম ১৫ নভেম্বর, ফি ১৬ নভেম্বর পর্যন্ত	\N	জাতীয় বিশ্ববিদ্যালয়ে ২০২৪-২৫ শিক্ষাবর্ষের নিয়মিত মাস্টার্সে প্রাথমিক আবেদন চলছে। ফরম পূরণের শেষ ১৫ নভেম্বর, ফি ১ হাজার টাকা, ক্লাস ১০ ডিসেম্বর — পুরো সময়চক্র।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আবেদন করবেন যেভাবে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বিজ্ঞপ্তিটা এসেছে সোমবার। শিক্ষার্থীদের প্রাথমিক আবেদন ফরম পূরণ করতে হবে জাতীয় বিশ্ববিদ্যালয়ের ভর্তি-ওয়েবসাইটে। ধাপে ধাপে নির্দেশিকা পাওয়া যাবে সেখানকার 'Prospectus/Important Notice' অপশনে — ফরম ভরার আগে ওটা একবার পড়ে নিলে পরে সংশোধনের ঝামেলা থাকবে না।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফি দেবেন কোথায়, কীভাবে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আবেদন ফি ১ হাজার টাকা। জমা দেওয়া যাবে নিজ নিজ কলেজে — কলেজ-নির্ধারিত মোবাইল ব্যাংকিংয়ের মাধ্যমে বা সরাসরি। কিন্তু খেয়াল রাখুন, ফরম আর ফি-এর সময়সীমা আলাদা: ফরমের দরজা বন্ধ হয় ১৫ নভেম্বর মধ্যরাতে, ফি পাওয়া যাবে ১৬ নভেম্বর পর্যন্ত। ফরম ভরে ফি না দিলে আবেদন আসলে আবেদনই থাকবে না।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তিনটা তারিখ ফোনের ক্যালেন্ডারে সেভ করুন — ১৫, ১৬ নভেম্বর আর ১০ ডিসেম্বর। ফরমে কলেজ-রোল, সেশন, বিষয়ের তথ্য একবার বোর্ড-সনদের সঙ্গে মিলিয়ে ভরুন। আর যাঁরা চাকরির সঙ্গে মাস্টার্স চালান, তাঁদের জন্য ক্লাস শুরু ১০ ডিসেম্বর — পরিকল্পনা সেভাবেই সাজান।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/applications-for-masters-admission-at-the-national-university-begin-tomorrow-387453", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	nu-masters-admission-2024-25	15	5	1	approved	\N	2026-10-15 22:36:53.894+00	1	2026-10-27 06:35:04.106+00	2026-10-27 06:35:04.102+00	published	2026-10-27 06:35:04.377+00	2026-10-27 06:35:04.377+00	t	f
8	8	ইবতেদায়ি ৫ম ও দাখিল ৮ম বৃত্তি পরীক্ষার কেন্দ্রতালিকা প্রকাশ — সংশোধনীর শেষ ১৭ অক্টোবর	\N	২০২৬ সালের ইবতেদায়ি ৫ম ও দাখিল ৮ম বৃত্তি পরীক্ষার কেন্দ্রের তালিকা প্রকাশ করেছে মাদ্রাসা শিক্ষা বোর্ড। নামে ভুল থাকলে সংশোধনীর শেষ সময় ১৭ অক্টোবর।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কোন তালিকা, কোথায়", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বোর্ডের এক চিঠিতে জানানো হয়েছে, ২০২৬ শিক্ষাবর্ষের ইবতেদায়ি ৫ম ও দাখিল ৮ম শ্রেণির বৃত্তি পরীক্ষার কেন্দ্রগুলো কেন্দ্রস্থিত মাদ্রাসার নামসহ প্রকাশ করা হয়েছে। মানে তালিকা মানে শুধু জেলা-শহরের নাম নয় — পরীক্ষাটা কোন মাদ্রাসায় বসবে, সেটাই মূল যাচাইয়ের বিষয়।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "নামে ভুল থাকলে করণীয়", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কেন্দ্রস্থিত মাদ্রাসার নামে কোনো ভুল বা সংশোধন দরকার হলে আবেদন করতে হবে লিখিতভাবে, ইমেইলে — সরাসরি মাদ্রাসা শিক্ষা বোর্ড চেয়ারম্যানের দপ্তরে। সময়সীমা ১৭ অক্টোবর। দিন দশেক পরে ফোন করে জানানোর জায়গা এখানে নেই — সীমা পার হলে তালিকাই টিকবে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আজই করুন দুটো কাজ: আপনার মাদ্রাসার নাম তালিকায় বানান-আকার মিলিয়ে দেখুন, আর কেন্দ্র কোথায় সেটা নোট করে রাখুন। ত্রুটি চোখে পড়লে দলিল-প্রমাণসহ আবেদনটা ইমেইলে পাঠান — ১৭ অক্টোবরের আগে। বৃত্তি পরীক্ষার রুটিন-সিলেবাস প্রকাশ হলে আমরাও এই পাতায় সাজিয়ে রাখব।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/see-the-list-of-ebtedayi-5th-and-dakhil-8th-grade-scholarship-examination-centers-387509", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	madrasah-scholarship-exam-centres-2026	16	7	1	approved	\N	2026-10-15 22:36:53.749+00	1	2026-10-27 06:35:04.911+00	2026-10-27 06:35:04.911+00	published	2026-10-27 06:35:05.208+00	2026-10-27 06:35:05.208+00	t	f
9	9	৪৫তম বিসিএসের প্রজ্ঞাপন জারি: ১ হাজার ৭০২ প্রার্থী এবার ক্যাডার — যোগদানের শেষ সময় ১ নভেম্বর	\N	৪৫তম বিসিএসে ১,৭০২ জনকে ৯ম গ্রেডে নিয়োগ দিয়ে প্রজ্ঞাপন জারি করেছে জনপ্রশাসন মন্ত্রণালয়। যোগদানের শেষ তারিখ ১ নভেম্বর — না করলে নিয়োগ বাতিল।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "প্রজ্ঞাপনে কী লেখা আছে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বুধবার জারি হওয়া প্রজ্ঞাপনে বলা হয়েছে, বিসিএসের বিভিন্ন ক্যাডারের প্রবেশ পদে পিএসসির সুপারিশক্রমে নিয়োগ দেওয়া হয়েছে। সুপারিশের চিঠি পিএসসি পাঠিয়েছিল ১৪ ডিসেম্বর ২০২৫-এ — তার পর মন্ত্রণালয়ের ঘরে ঘুরে ঘুরে এসে পৌঁছেছে প্রজ্ঞাপন। সবাই ৯ম গ্রেডে; জাতীয় বেতনস্কেল-২০২৬ অনুযায়ী শুরুটা ৪৪ হাজার টাকা, ধাপে ধাপে সর্বোচ্চ ১ লাখ ৫ হাজার ৯০০।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তারিখটা কেন এত গুরুত্বপূর্ণ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "নিয়োগের শর্তাবলি গ্রহণ করলে ১ নভেম্বরের মধ্যে আপনার ক্যাডারের নিয়ন্ত্রক মন্ত্রণালয় বা বিভাগের নির্ধারিত কার্যালয়ে কায়েম হতে হবে। আর সেদিনের মধ্যে যোগদান না করলে? প্রজ্ঞাপন স্পষ্ট — প্রার্থীকে অসম্মত ধরে নিয়ে নিয়োগপত্র বাতিল মনে করা হবে। মানে মিস করা মানে শুধু দেরি নয়, বিসিএসের চার বছর ফেরৎ যাওয়া।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "প্রজ্ঞাপনটা নিজের চোখে পড়ুন, শর্তাবলিতে সই-এর আগে প্রতিটি লাইন দেখুন। কোন অফিসে যোগদান দিতে হবে সেটা আপনার ক্যাডার বরাদ্দ অনুযায়ী আলাদা — ওপরের নথির সঙ্গেই কার্যালয়ের নাম থাকবে। যাতায়াত-থাকার ব্যবস্থা ১ নভেম্বরের আগেই গুছিয়ে ফেলুন; দেরির বখশিশ এই প্রজ্ঞাপনে নেই।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/gazette-notification-issued-appointing-1702-candidates-to-the-45th-bcs-387577", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	45th-bcs-appointment-notice	17	1	1	approved	\N	2026-10-15 22:36:53.637+00	1	2026-10-27 06:35:05.674+00	2026-10-27 06:35:05.674+00	published	2026-10-27 06:35:05.841+00	2026-10-27 06:35:05.841+00	t	f
12	10	সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ — ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে	\N	সরকারি মাধ্যমিকে ভর্তির নীতিমালা-২০২৭ জারি হয়েছে। ঢাকায় ৪০% ক্যাচমেন্ট, ৫ কোটায় ১৪% আসন, ১ম শ্রেণিতে লটারি ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা — অভিভাবকদের জন্য এক পাতায় পুরো হিসাব।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মূল খবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গজরীর নিয়মে এবার ভর্তির দরজা খুলবে তিন দরজা দিয়ে। প্রথম দরজা ক্যাচমেন্ট: ঢাকা মহানগরীর সরকারি বিদ্যালয়গুলোতে আসনের ৪০ শতাংশ থাকবে স্কুলের চারপাশের এলাকার শিশুদের জন্য। কোন ঠিকানা কোন স্কুলে পড়বে, তার নকশা আঁকবে মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর। বাকি ৬০ শতাংশ — ওপেন, যে কেউ লড়তে পারবেন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "দ্বিতীয় দরজা কোটা। নীতিমালার ১৭ ধারায় পাঁচ রকম সংরক্ষণ, মোট ১৪ শতাংশ: মুক্তিযোদ্ধা ও শহীদ মুক্তিযোদ্ধার সন্তানদের ৫ শতাংশ, সহোদর–সহোদরাদের ৩ শতাংশ, যমজ ভাই–বোনদের ২ শতাংশ, বিশেষ চাহিদাসম্পন্নদের ২ শতাংশ, আর মন্ত্রণালয়-দপ্তর-সংস্থার কর্মীদের সন্তানদের ২ শতাংশ (১+১)।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ছোট হিসাব, বড় ফাঁদ: সহোদর আর যমজ কোটার সুযোগ এক পরিবারের সর্বোচ্চ তিন সন্তান পর্যন্ত। আর কোনো কোটায় যোগ্য প্রার্থী না মিললে আসন খালি রাখা যাবে না — নিয়ম মেনে উন্মুক্ত পুলে যোগ হয়ে যাবে। মুক্তিযোদ্ধা কোটায় আবেদনের সময় সত্যায়িত কপি দিতে হবে, ভর্তির দিন দেখাতে হবে মূল কপি।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তৃতীয় দরজা পরীক্ষা আর লটারি। ১ম শ্রেণিতে শিশু পরীক্ষার চাপ না পায় — থাকবে ডিজিটাল লটারি। ২য় থেকে ৯ম শ্রেণি? ভর্তি পরীক্ষা। আর ৬ষ্ঠ শ্রেণিতে একটা আলাদা সুবিধা আছে: স্বতন্ত্র সরকারি প্রাথমিক থেকে পঞ্চম শ্রেণি পাস করা শিশুদের জন্য মোট আসনের ১০ শতাংশ আলাদা করে রাখা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আদালতের যে প্রেক্ষাপটটা জানা দরকার", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব স্কুলে ভর্তি পরীক্ষা বাতিলের দাবিতে ৭ অক্টোবর হাইকোর্টে রিটও করা হয়েছিল। দেওয়ানি উত্তেজনা — কিন্তু ১৪ অক্টোবর অবকাশকালীন বেঞ্চ রিটটা কার্যতালিকা থেকে বাদ দিয়ে দিয়েছে, নিয়মিত বেঞ্চে যেতে বলে। মানে আপাতত সরকারের নিয়মই দাঁড়িয়ে: এক নম্বর ক্লাসে লটারি, বাকিতে পরীক্ষা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তির বিজ্ঞপ্তি আসার আগেই তিনটা কাজ করে ফেলুন: বাসার ঠিকানা কোন স্কুলের ক্যাচমেন্টে পড়ে সেটা যাচাই করুন (অধিদপ্তরের তালিকা প্রকাশ হলে আমরা জানাব এখানেই)। কোটার দাবি থাকলে কাগজপত্র গুছিয়ে রাখুন — বিশেষ করে মুক্তিযোদ্ধা সনদ। আর ৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারির ছেলেমেয়ে? ওদের তো ১০ শতাংশ দরজা আলাদাই খোলা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikshasangbad.com/secondary/22984/", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা সংবাদ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/five-types-of-quotas-for-school-admission-14-percent-of-seats-reserved-387498", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/writ-petition-seeking-cancellation-of-school-admission-test-removed-from-the-cause-list-387495", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা (রিট)", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	t	t	f	\N	f	\N	admission-policy-2027	18	6	1	approved	\N	2026-10-15 22:36:53.513+00	1	2026-10-27 10:04:58.718+00	2026-10-27 06:35:06.171+00	published	2026-10-27 10:04:58.849+00	2026-10-27 10:04:58.849+00	f	f
13	10	সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ — ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে	\N	সরকারি মাধ্যমিকে ভর্তির নীতিমালা-২০২৭ জারি হয়েছে। ঢাকায় ৪০% ক্যাচমেন্ট, ৫ কোটায় ১৪% আসন, ১ম শ্রেণিতে লটারি ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা — অভিভাবকদের জন্য এক পাতায় পুরো হিসাব।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মূল খবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গজরীর নিয়মে এবার ভর্তির দরজা খুলবে তিন দরজা দিয়ে। প্রথম দরজা ক্যাচমেন্ট: ঢাকা মহানগরীর সরকারি বিদ্যালয়গুলোতে আসনের ৪০ শতাংশ থাকবে স্কুলের চারপাশের এলাকার শিশুদের জন্য। কোন ঠিকানা কোন স্কুলে পড়বে, তার নকশা আঁকবে মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর। বাকি ৬০ শতাংশ — ওপেন, যে কেউ লড়তে পারবেন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "দ্বিতীয় দরজা কোটা। নীতিমালার ১৭ ধারায় পাঁচ রকম সংরক্ষণ, মোট ১৪ শতাংশ: মুক্তিযোদ্ধা ও শহীদ মুক্তিযোদ্ধার সন্তানদের ৫ শতাংশ, সহোদর–সহোদরাদের ৩ শতাংশ, যমজ ভাই–বোনদের ২ শতাংশ, বিশেষ চাহিদাসম্পন্নদের ২ শতাংশ, আর মন্ত্রণালয়-দপ্তর-সংস্থার কর্মীদের সন্তানদের ২ শতাংশ (১+১)।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ছোট হিসাব, বড় ফাঁদ: সহোদর আর যমজ কোটার সুযোগ এক পরিবারের সর্বোচ্চ তিন সন্তান পর্যন্ত। আর কোনো কোটায় যোগ্য প্রার্থী না মিললে আসন খালি রাখা যাবে না — নিয়ম মেনে উন্মুক্ত পুলে যোগ হয়ে যাবে। মুক্তিযোদ্ধা কোটায় আবেদনের সময় সত্যায়িত কপি দিতে হবে, ভর্তির দিন দেখাতে হবে মূল কপি।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তৃতীয় দরজা পরীক্ষা আর লটারি। ১ম শ্রেণিতে শিশু পরীক্ষার চাপ না পায় — থাকবে ডিজিটাল লটারি। ২য় থেকে ৯ম শ্রেণি? ভর্তি পরীক্ষা। আর ৬ষ্ঠ শ্রেণিতে একটা আলাদা সুবিধা আছে: স্বতন্ত্র সরকারি প্রাথমিক থেকে পঞ্চম শ্রেণি পাস করা শিশুদের জন্য মোট আসনের ১০ শতাংশ আলাদা করে রাখা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আদালতের যে প্রেক্ষাপটটা জানা দরকার", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব স্কুলে ভর্তি পরীক্ষা বাতিলের দাবিতে ৭ অক্টোবর হাইকোর্টে রিটও করা হয়েছিল। দেওয়ানি উত্তেজনা — কিন্তু ১৪ অক্টোবর অবকাশকালীন বেঞ্চ রিটটা কার্যতালিকা থেকে বাদ দিয়ে দিয়েছে, নিয়মিত বেঞ্চে যেতে বলে। মানে আপাতত সরকারের নিয়মই দাঁড়িয়ে: এক নম্বর ক্লাসে লটারি, বাকিতে পরীক্ষা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তির বিজ্ঞপ্তি আসার আগেই তিনটা কাজ করে ফেলুন: বাসার ঠিকানা কোন স্কুলের ক্যাচমেন্টে পড়ে সেটা যাচাই করুন (অধিদপ্তরের তালিকা প্রকাশ হলে আমরা জানাব এখানেই)। কোটার দাবি থাকলে কাগজপত্র গুছিয়ে রাখুন — বিশেষ করে মুক্তিযোদ্ধা সনদ। আর ৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারির ছেলেমেয়ে? ওদের তো ১০ শতাংশ দরজা আলাদাই খোলা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikshasangbad.com/secondary/22984/", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা সংবাদ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/five-types-of-quotas-for-school-admission-14-percent-of-seats-reserved-387498", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/writ-petition-seeking-cancellation-of-school-admission-test-removed-from-the-cause-list-387495", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা (রিট)", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	admission-policy-2027	18	6	1	approved	\N	2026-10-15 22:36:53.513+00	1	2026-10-27 13:23:56.938+00	2026-10-27 06:35:06.171+00	draft	2026-10-27 13:23:55.646+00	2026-10-27 13:23:56.938+00	f	t
14	10	সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ — ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে	\N	সরকারি মাধ্যমিকে ভর্তির নীতিমালা-২০২৭ জারি হয়েছে। ঢাকায় ৪০% ক্যাচমেন্ট, ৫ কোটায় ১৪% আসন, ১ম শ্রেণিতে লটারি ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা — অভিভাবকদের জন্য এক পাতায় পুরো হিসাব।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মূল খবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গজরীর নিয়মে এবার ভর্তির দরজা খুলবে তিন দরজা দিয়ে। প্রথম দরজা ক্যাচমেন্ট: ঢাকা মহানগরীর সরকারি বিদ্যালয়গুলোতে আসনের ৪০ শতাংশ থাকবে স্কুলের চারপাশের এলাকার শিশুদের জন্য। কোন ঠিকানা কোন স্কুলে পড়বে, তার নকশা আঁকবে মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর। বাকি ৬০ শতাংশ — ওপেন, যে কেউ লড়তে পারবেন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "দ্বিতীয় দরজা কোটা। নীতিমালার ১৭ ধারায় পাঁচ রকম সংরক্ষণ, মোট ১৪ শতাংশ: মুক্তিযোদ্ধা ও শহীদ মুক্তিযোদ্ধার সন্তানদের ৫ শতাংশ, সহোদর–সহোদরাদের ৩ শতাংশ, যমজ ভাই–বোনদের ২ শতাংশ, বিশেষ চাহিদাসম্পন্নদের ২ শতাংশ, আর মন্ত্রণালয়-দপ্তর-সংস্থার কর্মীদের সন্তানদের ২ শতাংশ (১+১)।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ছোট হিসাব, বড় ফাঁদ: সহোদর আর যমজ কোটার সুযোগ এক পরিবারের সর্বোচ্চ তিন সন্তান পর্যন্ত। আর কোনো কোটায় যোগ্য প্রার্থী না মিললে আসন খালি রাখা যাবে না — নিয়ম মেনে উন্মুক্ত পুলে যোগ হয়ে যাবে। মুক্তিযোদ্ধা কোটায় আবেদনের সময় সত্যায়িত কপি দিতে হবে, ভর্তির দিন দেখাতে হবে মূল কপি।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তৃতীয় দরজা পরীক্ষা আর লটারি। ১ম শ্রেণিতে শিশু পরীক্ষার চাপ না পায় — থাকবে ডিজিটাল লটারি। ২য় থেকে ৯ম শ্রেণি? ভর্তি পরীক্ষা। আর ৬ষ্ঠ শ্রেণিতে একটা আলাদা সুবিধা আছে: স্বতন্ত্র সরকারি প্রাথমিক থেকে পঞ্চম শ্রেণি পাস করা শিশুদের জন্য মোট আসনের ১০ শতাংশ আলাদা করে রাখা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আদালতের যে প্রেক্ষাপটটা জানা দরকার", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব স্কুলে ভর্তি পরীক্ষা বাতিলের দাবিতে ৭ অক্টোবর হাইকোর্টে রিটও করা হয়েছিল। দেওয়ানি উত্তেজনা — কিন্তু ১৪ অক্টোবর অবকাশকালীন বেঞ্চ রিটটা কার্যতালিকা থেকে বাদ দিয়ে দিয়েছে, নিয়মিত বেঞ্চে যেতে বলে। মানে আপাতত সরকারের নিয়মই দাঁড়িয়ে: এক নম্বর ক্লাসে লটারি, বাকিতে পরীক্ষা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তির বিজ্ঞপ্তি আসার আগেই তিনটা কাজ করে ফেলুন: বাসার ঠিকানা কোন স্কুলের ক্যাচমেন্টে পড়ে সেটা যাচাই করুন (অধিদপ্তরের তালিকা প্রকাশ হলে আমরা জানাব এখানেই)। কোটার দাবি থাকলে কাগজপত্র গুছিয়ে রাখুন — বিশেষ করে মুক্তিযোদ্ধা সনদ। আর ৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারির ছেলেমেয়ে? ওদের তো ১০ শতাংশ দরজা আলাদাই খোলা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikshasangbad.com/secondary/22984/", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা সংবাদ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/five-types-of-quotas-for-school-admission-14-percent-of-seats-reserved-387498", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/writ-petition-seeking-cancellation-of-school-admission-test-removed-from-the-cause-list-387495", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা (রিট)", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	admission-policy-2027	18	6	1	approved	\N	2026-10-15 22:36:53.513+00	1	2026-10-27 13:23:58.133+00	2026-10-27 06:35:06.171+00	published	2026-10-27 13:23:58.175+00	2026-10-27 13:23:58.175+00	t	f
11	10	সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ — ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে	\N	সরকারি মাধ্যমিকে ভর্তির নীতিমালা-২০২৭ জারি হয়েছে। ঢাকায় ৪০% ক্যাচমেন্ট, ৫ কোটায় ১৪% আসন, ১ম শ্রেণিতে লটারি ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা — অভিভাবকদের জন্য এক পাতায় পুরো হিসাব।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মূল খবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গজরীর নিয়মে এবার ভর্তির দরজা খুলবে তিন দরজা দিয়ে। প্রথম দরজা ক্যাচমেন্ট: ঢাকা মহানগরীর সরকারি বিদ্যালয়গুলোতে আসনের ৪০ শতাংশ থাকবে স্কুলের চারপাশের এলাকার শিশুদের জন্য। কোন ঠিকানা কোন স্কুলে পড়বে, তার নকশা আঁকবে মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর। বাকি ৬০ শতাংশ — ওপেন, যে কেউ লড়তে পারবেন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "দ্বিতীয় দরজা কোটা। নীতিমালার ১৭ ধারায় পাঁচ রকম সংরক্ষণ, মোট ১৪ শতাংশ: মুক্তিযোদ্ধা ও শহীদ মুক্তিযোদ্ধার সন্তানদের ৫ শতাংশ, সহোদর–সহোদরাদের ৩ শতাংশ, যমজ ভাই–বোনদের ২ শতাংশ, বিশেষ চাহিদাসম্পন্নদের ২ শতাংশ, আর মন্ত্রণালয়-দপ্তর-সংস্থার কর্মীদের সন্তানদের ২ শতাংশ (১+১)।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ছোট হিসাব, বড় ফাঁদ: সহোদর আর যমজ কোটার সুযোগ এক পরিবারের সর্বোচ্চ তিন সন্তান পর্যন্ত। আর কোনো কোটায় যোগ্য প্রার্থী না মিললে আসন খালি রাখা যাবে না — নিয়ম মেনে উন্মুক্ত পুলে যোগ হয়ে যাবে। মুক্তিযোদ্ধা কোটায় আবেদনের সময় সত্যায়িত কপি দিতে হবে, ভর্তির দিন দেখাতে হবে মূল কপি।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তৃতীয় দরজা পরীক্ষা আর লটারি। ১ম শ্রেণিতে শিশু পরীক্ষার চাপ না পায় — থাকবে ডিজিটাল লটারি। ২য় থেকে ৯ম শ্রেণি? ভর্তি পরীক্ষা। আর ৬ষ্ঠ শ্রেণিতে একটা আলাদা সুবিধা আছে: স্বতন্ত্র সরকারি প্রাথমিক থেকে পঞ্চম শ্রেণি পাস করা শিশুদের জন্য মোট আসনের ১০ শতাংশ আলাদা করে রাখা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আদালতের যে প্রেক্ষাপটটা জানা দরকার", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব স্কুলে ভর্তি পরীক্ষা বাতিলের দাবিতে ৭ অক্টোবর হাইকোর্টে রিটও করা হয়েছিল। দেওয়ানি উত্তেজনা — কিন্তু ১৪ অক্টোবর অবকাশকালীন বেঞ্চ রিটটা কার্যতালিকা থেকে বাদ দিয়ে দিয়েছে, নিয়মিত বেঞ্চে যেতে বলে। মানে আপাতত সরকারের নিয়মই দাঁড়িয়ে: এক নম্বর ক্লাসে লটারি, বাকিতে পরীক্ষা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তির বিজ্ঞপ্তি আসার আগেই তিনটা কাজ করে ফেলুন: বাসার ঠিকানা কোন স্কুলের ক্যাচমেন্টে পড়ে সেটা যাচাই করুন (অধিদপ্তরের তালিকা প্রকাশ হলে আমরা জানাব এখানেই)। কোটার দাবি থাকলে কাগজপত্র গুছিয়ে রাখুন — বিশেষ করে মুক্তিযোদ্ধা সনদ। আর ৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারির ছেলেমেয়ে? ওদের তো ১০ শতাংশ দরজা আলাদাই খোলা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikshasangbad.com/secondary/22984/", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা সংবাদ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/five-types-of-quotas-for-school-admission-14-percent-of-seats-reserved-387498", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/writ-petition-seeking-cancellation-of-school-admission-test-removed-from-the-cause-list-387495", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা (রিট)", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	t	t	f	\N	f	\N	admission-policy-2027	18	6	1	approved	\N	2026-10-15 22:36:53.513+00	1	2026-10-27 10:04:57.485+00	2026-10-27 06:35:06.171+00	draft	2026-10-27 10:04:57.485+00	2026-10-27 10:04:57.485+00	f	t
10	10	সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ — ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে	\N	সরকারি মাধ্যমিকে ভর্তির নীতিমালা-২০২৭ জারি হয়েছে। ঢাকায় ৪০% ক্যাচমেন্ট, ৫ কোটায় ১৪% আসন, ১ম শ্রেণিতে লটারি ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা — অভিভাবকদের জন্য এক পাতায় পুরো হিসাব।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মূল খবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গজরীর নিয়মে এবার ভর্তির দরজা খুলবে তিন দরজা দিয়ে। প্রথম দরজা ক্যাচমেন্ট: ঢাকা মহানগরীর সরকারি বিদ্যালয়গুলোতে আসনের ৪০ শতাংশ থাকবে স্কুলের চারপাশের এলাকার শিশুদের জন্য। কোন ঠিকানা কোন স্কুলে পড়বে, তার নকশা আঁকবে মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর। বাকি ৬০ শতাংশ — ওপেন, যে কেউ লড়তে পারবেন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "দ্বিতীয় দরজা কোটা। নীতিমালার ১৭ ধারায় পাঁচ রকম সংরক্ষণ, মোট ১৪ শতাংশ: মুক্তিযোদ্ধা ও শহীদ মুক্তিযোদ্ধার সন্তানদের ৫ শতাংশ, সহোদর–সহোদরাদের ৩ শতাংশ, যমজ ভাই–বোনদের ২ শতাংশ, বিশেষ চাহিদাসম্পন্নদের ২ শতাংশ, আর মন্ত্রণালয়-দপ্তর-সংস্থার কর্মীদের সন্তানদের ২ শতাংশ (১+১)।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ছোট হিসাব, বড় ফাঁদ: সহোদর আর যমজ কোটার সুযোগ এক পরিবারের সর্বোচ্চ তিন সন্তান পর্যন্ত। আর কোনো কোটায় যোগ্য প্রার্থী না মিললে আসন খালি রাখা যাবে না — নিয়ম মেনে উন্মুক্ত পুলে যোগ হয়ে যাবে। মুক্তিযোদ্ধা কোটায় আবেদনের সময় সত্যায়িত কপি দিতে হবে, ভর্তির দিন দেখাতে হবে মূল কপি।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তৃতীয় দরজা পরীক্ষা আর লটারি। ১ম শ্রেণিতে শিশু পরীক্ষার চাপ না পায় — থাকবে ডিজিটাল লটারি। ২য় থেকে ৯ম শ্রেণি? ভর্তি পরীক্ষা। আর ৬ষ্ঠ শ্রেণিতে একটা আলাদা সুবিধা আছে: স্বতন্ত্র সরকারি প্রাথমিক থেকে পঞ্চম শ্রেণি পাস করা শিশুদের জন্য মোট আসনের ১০ শতাংশ আলাদা করে রাখা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আদালতের যে প্রেক্ষাপটটা জানা দরকার", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব স্কুলে ভর্তি পরীক্ষা বাতিলের দাবিতে ৭ অক্টোবর হাইকোর্টে রিটও করা হয়েছিল। দেওয়ানি উত্তেজনা — কিন্তু ১৪ অক্টোবর অবকাশকালীন বেঞ্চ রিটটা কার্যতালিকা থেকে বাদ দিয়ে দিয়েছে, নিয়মিত বেঞ্চে যেতে বলে। মানে আপাতত সরকারের নিয়মই দাঁড়িয়ে: এক নম্বর ক্লাসে লটারি, বাকিতে পরীক্ষা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তির বিজ্ঞপ্তি আসার আগেই তিনটা কাজ করে ফেলুন: বাসার ঠিকানা কোন স্কুলের ক্যাচমেন্টে পড়ে সেটা যাচাই করুন (অধিদপ্তরের তালিকা প্রকাশ হলে আমরা জানাব এখানেই)। কোটার দাবি থাকলে কাগজপত্র গুছিয়ে রাখুন — বিশেষ করে মুক্তিযোদ্ধা সনদ। আর ৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারির ছেলেমেয়ে? ওদের তো ১০ শতাংশ দরজা আলাদাই খোলা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikshasangbad.com/secondary/22984/", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা সংবাদ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/five-types-of-quotas-for-school-admission-14-percent-of-seats-reserved-387498", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/writ-petition-seeking-cancellation-of-school-admission-test-removed-from-the-cause-list-387495", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা (রিট)", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	admission-policy-2027	18	6	1	approved	\N	2026-10-15 22:36:53.513+00	1	2026-10-27 06:35:06.171+00	2026-10-27 06:35:06.171+00	published	2026-10-27 06:35:06.395+00	2026-10-27 06:35:06.395+00	f	f
16	1	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	\N	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি অনুযায়ী ১৬টি ক্যাটাগরির উত্তীর্ণ শিক্ষার্থী ও গবেষকগণ রেজিস্ট্রেশন করতে পারবেন:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতক (পাস ও সম্মান): ২০১৩ থেকে ২০২৪ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতকোত্তরের বিভিন্ন বিষয়: ২০১৩ থেকে ২০২৩ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• গবেষকবৃন্দ (এমফিল ও পিএইচডি): ২০১৬ থেকে ২০২৫ সালের মধ্যে ডিগ্রি অর্জনকারী গবেষকগণ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনক্যাম্পাস প্রোগ্রাম: অনক্যাম্পাস প্রোগ্রামের উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গুরুত্বপূর্ণ তথ্যাবলি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনলাইন রেজিস্ট্রেশনের সময়সীমা: আগামী ১২ অক্টোবর থেকে ১২ নভেম্বর পর্যন্ত অনলাইনে নিবন্ধন সম্পন্ন করতে হবে।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• রেজিস্ট্রেশন ফি: অংশগ্রহণের জন্য মূল ফি ৪,০০০ টাকা নির্ধারণ করা হয়েছে", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	8	1	f	f	f	\N	f	\N	post-vkcnas	1	8	1	approved	\N	2026-10-26 08:25:43.4+00	1	2026-10-27 14:28:47.414+00	2026-10-27 06:35:00.715+00	published	2026-10-27 14:28:47.509+00	2026-10-27 14:28:47.509+00	t	f
15	1	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	\N	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি অনুযায়ী ১৬টি ক্যাটাগরির উত্তীর্ণ শিক্ষার্থী ও গবেষকগণ রেজিস্ট্রেশন করতে পারবেন:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতক (পাস ও সম্মান): ২০১৩ থেকে ২০২৪ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতকোত্তরের বিভিন্ন বিষয়: ২০১৩ থেকে ২০২৩ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• গবেষকবৃন্দ (এমফিল ও পিএইচডি): ২০১৬ থেকে ২০২৫ সালের মধ্যে ডিগ্রি অর্জনকারী গবেষকগণ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনক্যাম্পাস প্রোগ্রাম: অনক্যাম্পাস প্রোগ্রামের উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গুরুত্বপূর্ণ তথ্যাবলি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনলাইন রেজিস্ট্রেশনের সময়সীমা: আগামী ১২ অক্টোবর থেকে ১২ নভেম্বর পর্যন্ত অনলাইনে নিবন্ধন সম্পন্ন করতে হবে।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• রেজিস্ট্রেশন ফি: অংশগ্রহণের জন্য মূল ফি ৪,০০০ টাকা নির্ধারণ করা হয়েছে", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	8	1	f	f	f	\N	f	\N	post-vkcnas	1	8	1	approved	\N	2026-10-26 08:25:43.4+00	1	2026-10-27 14:28:43.4+00	2026-10-27 06:35:00.715+00	draft	2026-10-27 14:28:43.4+00	2026-10-27 14:28:43.4+00	f	t
1	1	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	\N	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি অনুযায়ী ১৬টি ক্যাটাগরির উত্তীর্ণ শিক্ষার্থী ও গবেষকগণ রেজিস্ট্রেশন করতে পারবেন:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতক (পাস ও সম্মান): ২০১৩ থেকে ২০২৪ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতকোত্তরের বিভিন্ন বিষয়: ২০১৩ থেকে ২০২৩ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• গবেষকবৃন্দ (এমফিল ও পিএইচডি): ২০১৬ থেকে ২০২৫ সালের মধ্যে ডিগ্রি অর্জনকারী গবেষকগণ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনক্যাম্পাস প্রোগ্রাম: অনক্যাম্পাস প্রোগ্রামের উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গুরুত্বপূর্ণ তথ্যাবলি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনলাইন রেজিস্ট্রেশনের সময়সীমা: আগামী ১২ অক্টোবর থেকে ১২ নভেম্বর পর্যন্ত অনলাইনে নিবন্ধন সম্পন্ন করতে হবে।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• রেজিস্ট্রেশন ফি: অংশগ্রহণের জন্য মূল ফি ৪,০০০ টাকা নির্ধারণ করা হয়েছে", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	8	1	t	t	f	\N	f	\N	post-vkcnas	1	8	1	approved	\N	2026-10-26 08:25:43.4+00	1	2026-10-27 06:35:00.715+00	2026-10-27 06:35:00.715+00	published	2026-10-27 06:35:00.927+00	2026-10-27 06:35:00.927+00	f	f
\.


--
-- Data for Name: _articles_v_rels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._articles_v_rels (id, "order", parent_id, path, levels_id, districts_id, tags_id) FROM stdin;
1	1	1	version.level	1	\N	\N
2	1	1	version.district	\N	64	\N
3	1	3	version.level	3	\N	\N
4	1	3	version.tags	\N	\N	30
5	1	4	version.tags	\N	\N	30
6	2	4	version.tags	\N	\N	28
7	3	4	version.tags	\N	\N	26
8	4	4	version.tags	\N	\N	25
9	1	5	version.level	2	\N	\N
10	1	6	version.level	3	\N	\N
11	1	7	version.level	1	\N	\N
12	1	8	version.level	5	\N	\N
13	2	8	version.level	4	\N	\N
14	1	10	version.level	4	\N	\N
15	2	10	version.level	5	\N	\N
16	1	11	version.level	4	\N	\N
17	2	11	version.level	5	\N	\N
18	1	12	version.level	4	\N	\N
19	2	12	version.level	5	\N	\N
22	1	13	version.level	4	\N	\N
23	2	13	version.level	5	\N	\N
24	1	14	version.level	4	\N	\N
25	2	14	version.level	5	\N	\N
26	1	15	version.level	1	\N	\N
27	1	15	version.district	\N	64	\N
28	1	16	version.level	1	\N	\N
29	1	16	version.district	\N	64	\N
\.


--
-- Data for Name: _articles_v_version_key_takeaways; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._articles_v_version_key_takeaways (_order, _parent_id, id, point, _uuid) FROM stdin;
1	5	1	প্রাথমিক পরিকল্পনা: ভর্তি পরীক্ষা ১৭–২৮ জানুয়ারি	6ad155868e8c14fb40ca16ff
2	5	2	চূড়ান্ত তারিখ-সময়সীমা হবে ২৮ অক্টোবরের কমিটি বৈঠকে	6ad155868e8c14fb40ca1700
3	5	3	বিভাগীয় শহরে পরীক্ষার সম্ভাবনা কম — উপকমিটির প্রতিবেদন বিরুদ্ধ	6ad155868e8c14fb40ca1701
4	5	4	কারণ: খরচ, আর অন্যান্য বিশ্ববিদ্যালয়ের তারিখের সঙ্গে সমন্বয়	6ad155868e8c14fb40ca1702
5	5	5	বক্তব্য: ভর্তি কমিটির সদস্য সচিব সৈয়দ মোহাম্মদ আলী রেজা	6ad155868e8c14fb40ca1703
1	6	6	ফল প্রকাশের সম্ভাব্য জানালা ২৫–২৯ অক্টোবর (সমন্বয় কমিটির কর্মকর্তা, ১২ অক্টোবর)	6ad155868e8c14fb40ca16fa
2	6	7	আগের লক্ষ্যমাত্রা ছিল ১–১৫ নভেম্বর — তারিখ এগিয়ে আসছে	6ad155868e8c14fb40ca16fb
3	6	8	কারণ: চট্টগ্রাম, মাদ্রাসা ও কারিগরি বোর্ডের খাতা দেখা সম্ভব হচ্ছে	6ad155868e8c14fb40ca16fc
4	6	9	পরীক্ষার্থী ১২ লাখ ৭০ হাজার ৫৮৩ জন	6ad155868e8c14fb40ca16fd
5	6	10	চূড়ান্ত তারিখ জানাব বোর্ডগুলো — ঘোষণার আগে সংখ্যা ধরে রাখা যাবে না	6ad155868e8c14fb40ca16fe
1	7	11	প্রাথমিক আবেদন: ১৪ অক্টোবর বিকেল ৪টা থেকে ১৫ নভেম্বর রাত ১২টা	6ad155858e8c14fb40ca16f6
2	7	12	আবেদন ফি ১,০০০ টাকা — ফি জমার শেষ ১৬ নভেম্বর	6ad155858e8c14fb40ca16f7
3	7	13	ফরম পূরণ www.nu.ac.bd/admissions-এ	6ad155858e8c14fb40ca16f8
4	7	14	ক্লাস শুরু ১০ ডিসেম্বর; বিজ্ঞপ্তি জারি ১২ অক্টোবর	6ad155858e8c14fb40ca16f9
1	8	15	কেন্দ্রের তালিকা প্রকাশ কেন্দ্রস্থিত মাদ্রাসার নামসহ	6ad155858e8c14fb40ca16f2
2	8	16	সংশোধনীর শেষ সময় ১৭ অক্টোবর	6ad155858e8c14fb40ca16f3
3	8	17	আবেদন যাবে ইমেইলে — বোর্ড চেয়ারম্যানের দপ্তরে	6ad155858e8c14fb40ca16f4
4	8	18	বোর্ডের চিঠিতে তথ্যটি জানানো হয়; প্রতিবেদন প্রকাশ ১৪ অক্টোবর	6ad155858e8c14fb40ca16f5
1	9	19	প্রজ্ঞাপন জারি ১৪ অক্টোবর, জনপ্রশাসন মন্ত্রণালয়	6ad155858e8c14fb40ca16ed
2	9	20	নিয়োগ ১ হাজার ৭০২ জন, বিভিন্ন ক্যাডারের প্রবেশ পদে	6ad155858e8c14fb40ca16ee
3	9	21	৯ম গ্রেড — মূল বেতন ৪৪ হাজার, সর্বোচ্চ ১ লাখ ৫ হাজার ৯০০ টাকা	6ad155858e8c14fb40ca16ef
4	9	22	পিএসসির সুপারিশ ছিল ১৪ ডিসেম্বর ২০২৫-র চিঠিতে	6ad155858e8c14fb40ca16f0
5	9	23	যোগদানের শেষ সময় ১ নভেম্বর; না গেলে নিয়োগ বাতিল	6ad155858e8c14fb40ca16f1
1	10	24	নীতিমালা জারি ১৩ অক্টোবর; সই উপসচিব তানিয়া ফেরদৌসের	6ad155858e8c14fb40ca16e8
2	10	25	ঢাকা মহানগরে ৪০% আসন ক্যাচমেন্টের জন্য, ৬০% উন্মুক্ত	6ad155858e8c14fb40ca16e9
3	10	26	১ম শ্রেণিতে ডিজিটাল লটারি, ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা	6ad155858e8c14fb40ca16ea
4	10	27	৫ কোটায় মোট ১৪% সংরক্ষিত আসন	6ad155858e8c14fb40ca16eb
5	10	28	৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারি-উত্তীর্ণদের জন্য আলাদা ১০%	6ad155858e8c14fb40ca16ec
1	11	29	নীতিমালা জারি ১৩ অক্টোবর; সই উপসচিব তানিয়া ফেরদৌসের	6ad155858e8c14fb40ca16e8
2	11	30	ঢাকা মহানগরে ৪০% আসন ক্যাচমেন্টের জন্য, ৬০% উন্মুক্ত	6ad155858e8c14fb40ca16e9
3	11	31	১ম শ্রেণিতে ডিজিটাল লটারি, ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা	6ad155858e8c14fb40ca16ea
4	11	32	৫ কোটায় মোট ১৪% সংরক্ষিত আসন	6ad155858e8c14fb40ca16eb
5	11	33	৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারি-উত্তীর্ণদের জন্য আলাদা ১০%	6ad155858e8c14fb40ca16ec
1	12	34	নীতিমালা জারি ১৩ অক্টোবর; সই উপসচিব তানিয়া ফেরদৌসের	6ad155858e8c14fb40ca16e8
2	12	35	ঢাকা মহানগরে ৪০% আসন ক্যাচমেন্টের জন্য, ৬০% উন্মুক্ত	6ad155858e8c14fb40ca16e9
3	12	36	১ম শ্রেণিতে ডিজিটাল লটারি, ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা	6ad155858e8c14fb40ca16ea
4	12	37	৫ কোটায় মোট ১৪% সংরক্ষিত আসন	6ad155858e8c14fb40ca16eb
5	12	38	৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারি-উত্তীর্ণদের জন্য আলাদা ১০%	6ad155858e8c14fb40ca16ec
1	13	44	নীতিমালা জারি ১৩ অক্টোবর; সই উপসচিব তানিয়া ফেরদৌসের	6ad155858e8c14fb40ca16e8
2	13	45	ঢাকা মহানগরে ৪০% আসন ক্যাচমেন্টের জন্য, ৬০% উন্মুক্ত	6ad155858e8c14fb40ca16e9
3	13	46	১ম শ্রেণিতে ডিজিটাল লটারি, ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা	6ad155858e8c14fb40ca16ea
4	13	47	৫ কোটায় মোট ১৪% সংরক্ষিত আসন	6ad155858e8c14fb40ca16eb
5	13	48	৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারি-উত্তীর্ণদের জন্য আলাদা ১০%	6ad155858e8c14fb40ca16ec
1	14	49	নীতিমালা জারি ১৩ অক্টোবর; সই উপসচিব তানিয়া ফেরদৌসের	6ad155858e8c14fb40ca16e8
2	14	50	ঢাকা মহানগরে ৪০% আসন ক্যাচমেন্টের জন্য, ৬০% উন্মুক্ত	6ad155858e8c14fb40ca16e9
3	14	51	১ম শ্রেণিতে ডিজিটাল লটারি, ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা	6ad155858e8c14fb40ca16ea
4	14	52	৫ কোটায় মোট ১৪% সংরক্ষিত আসন	6ad155858e8c14fb40ca16eb
5	14	53	৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারি-উত্তীর্ণদের জন্য আলাদা ১০%	6ad155858e8c14fb40ca16ec
\.


--
-- Data for Name: _articles_v_version_photo_story; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._articles_v_version_photo_story (_order, _parent_id, id, image_id, caption, credit, full_bleed, _uuid) FROM stdin;
\.


--
-- Data for Name: _articles_v_version_timeline_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._articles_v_version_timeline_milestones (_order, _parent_id, id, date, title, detail, _uuid) FROM stdin;
\.


--
-- Data for Name: articles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.articles (id, title, title_en, excerpt, body, layout, video_provider, video_url, subcategory_id, university_id, is_breaking, is_lead, is_sponsored, sponsor_name, correction_notice_has_correction, correction_notice_note, slug, featured_image_id, category_id, author_id, review_status, review_note, published_at, reading_time_minutes, updated_at, created_at, _status) FROM stdin;
2	আত্মপ্রকাশ করল — শিক্ষা২৪	\N	আজ শিক্ষা২৪ পৃথিবীর ডিজিটাল জগতে তার প্রথম পদচিহ্ন রাখল। আগামী দিনে এই পদচিহ্ন হয়ে উঠুক হাজারো শিক্ষার্থীর স্বপ্নপূরণের পথ।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "পৃথিবীর ডিজিটাল আকাশে নতুন এক আবির্ভাব… অসংখ্য স্বপ্ন, অগণিত সম্ভাবনা আর শিক্ষার্থীদের ভবিষ্যতের পথচলাকে আরও সহজ করার প্রত্যয় নিয়ে— আত্মপ্রকাশ করল — শিক্ষা২৪ (Shikkha24.com) এটি শুধু একটি ওয়েবসাইট নয়; এটি স্বপ্ন দেখা শিক্ষার্থীদের জন্য তথ্য, সুযোগ ও সম্ভাবনার একটি নতুন ঠিকানা। একটি সঠিক তথ্য, একটি সময়োপযোগী সিদ্ধান্ত, একটি স্কলারশিপের সুযোগ— বদলে দিতে পারে একজন শিক্ষার্থীর পুরো ভবিষ্যৎ। সেই বিশ্বাস থেকেই আমাদের পথচলা— শিক্ষার খবর ভবিষ্যতের সুযোগ বিশ্বের উচ্চশিক্ষার দুয়ার স্কলারশিপ ও ক্যারিয়ারের সম্ভাবনা সবকিছু এক প্ল্যাটফর্মে। আজ শিক্ষা২৪ পৃথিবীর ডিজিটাল জগতে তার প্রথম পদচিহ্ন রাখল। আগামী দিনে এই পদচিহ্ন হয়ে উঠুক হাজারো শিক্ষার্থীর স্বপ্নপূরণের পথ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	8	\N	t	t	f	\N	f	\N	post-ujepgq	\N	8	1	approved	\N	2026-10-18 04:51:46.093+00	1	2026-10-27 06:35:01.326+00	2026-10-27 06:35:01.326+00	published
3	একাদশ শ্রেণিতে ভর্তি হতে তৃতীয় ধাপে আবেদনের সুযোগ	\N	ভর্তি	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "২০২৬-২৭ শিক্ষাবর্ষে একাদশ শ্রেণিতে ভর্তির সর্বশেষ বা তৃতীয় ধাপের বিস্তারিত সময়সূচি", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " এবং গুরুত্বপূর্ণ নিয়মাবলি নিচে দেওয়া হলো", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 1}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "📅 গুরুত্বপূর্ণ সময়সূচি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"tag": "ul", "type": "list", "start": 1, "format": "", "indent": 0, "version": 1, "children": [{"type": "listitem", "value": 1, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "অনলাইন আবেদন:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ২৬ অক্টোবর থেকে ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "২৭ অক্টোবর ২০২৬ রাত ৮টা পর্যন্ত", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 2, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফল প্রকাশ:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "৩০ অক্টোবর ২০২৬ রাত ৮টায়", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 3, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সিলেকশন নিশ্চায়ন:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ৩০ অক্টোবর ফল প্রকাশের পর থেকে ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "৩১ অক্টোবর রাত ৮টা পর্যন্ত", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "। (এই সময়ের মধ্যে নিশ্চায়ন না করলে আবেদন ও নির্বাচন বাতিল হয়ে যাবে)।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 4, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মাইগ্রেশনের ফল প্রকাশ:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "১ নভেম্বর ২০২৬ রাত ৮টায়", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 5, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "চূড়ান্ত ভর্তি:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "২ ও ৩ নভেম্বর ২০২৬", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": "। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}], "listType": "bullet", "textFormat": 1}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "📋 আবেদনের নিয়ম ও শর্তাবলি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"tag": "ul", "type": "list", "start": 1, "format": "", "indent": 0, "version": 1, "children": [{"type": "listitem", "value": 1, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কারা আবেদন করতে পারবে:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " যারা আগে আবেদন করেনি, আবেদন করেও কোনো কলেজ পায়নি, চূড়ান্ত মনোনয়ন পেয়েও নিশ্চায়ন করতে পারেনি, নির্ধারিত সময়ে ভর্তি হতে পারেনি অথবা ভুল কোটার কারণে ভর্তি বাতিল হয়েছে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 2, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আগের নিশ্চায়ন বাতিল:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " পূর্বে নিশ্চায়নকৃত কোনো শিক্ষার্থী যদি এই ধাপে নতুন করে আবেদন করতে চায়, তবে ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "২৭ অক্টোবর ২০২৬ বিকেল ৪টার মধ্যে", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " নিজ বোর্ডে সশরীরে উপস্থিত হয়ে আগের নিশ্চায়ন বাতিল করতে হবে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 3, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আবেদন ফি:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " যারা ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "দ্বিতীয় ধাপে আবেদন করেও কোনো কলেজ পায়নি", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": ", তাদের এই তৃতীয় ধাপে নতুন করে কোনো আবেদন ফি (২২০ টাকা) দিতে হবে না। তারা শুধু ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"id": "6ad44f418c981107c78a26e7", "type": "link", "fields": {"url": "https://xiclassadmission.gov.bd/", "newTab": true, "linkType": "custom"}, "format": "", "indent": 0, "version": 3, "children": [{"mode": "normal", "text": "একাদশ শ্রেণি ভর্তির অফিসিয়াল ওয়েবসাইট", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": "-এ লগইন করে নতুন করে কলেজ পছন্দক্রম দিলেই চলবে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}, {"type": "listitem", "value": 4, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কলেজ সংখ্যা:", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " শিক্ষার্থীদের বিদ্যমান শূন্য আসন দেখে সর্বনিম্ন ৫টি এবং সর্বোচ্চ ১০টি কলেজের পছন্দক্রম দিয়ে আবেদন করতে হবে। ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}]}], "listType": "bullet", "textFormat": 1}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "এই ভর্তি প্রক্রিয়া সংক্রান্ত কোনো নির্দিষ্ট কলেজ বা পছন্দক্রম পরিবর্তন নিয়ে আপনার আর কোনো ", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}, {"mode": "normal", "text": "তথ্য জানার আছে কি?", "type": "text", "style": "", "detail": 0, "format": 1, "version": 1}, {"mode": "normal", "text": " আমি আপনাকে পরবর্তী ধাপে সাহায্য করতে পারি।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	6	\N	t	t	f	\N	f	\N	post-n2fili	\N	6	1	approved	\N	2026-10-18 04:45:08.412+00	1	2026-10-27 06:35:01.754+00	2026-10-27 06:35:01.754+00	published
5	জাবি ভর্তি পরীক্ষা প্রাথমিকভাবে ১৭–২৮ জানুয়ারি — বিভাগীয় শহরের আশা শেষ? চূড়ান্ত ২৮ অক্টোবরে	\N	জাহাঙ্গীরনগর বিশ্ববিদ্যালয়ের ২০২৬-২৭ শিক্ষাবর্ষের ভর্তি পরীক্ষা ১৭–২৮ জানুয়ারির মধ্যে নেওয়ার প্রাথমিক পরিকল্পনা; চূড়ান্ত হবে ২৮ অক্টোবরের বৈঠকে।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জানুয়ারির পরিকল্পনায় কী আছে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৮ জুলাই গঠিত চারটি উপকমিটি প্রতিবেদন দিয়েছে — এবারও বিভাগীয় পর্যায়ে পরীক্ষা না নেওয়ার পক্ষে। শুনে হতাশ হবেন যাঁরা সাভার না গিয়ে নিজের শহরে পরীক্ষা দিতে চেয়েছিলেন: বাধাগুলো হলো খরচ, আর অন্য বিশ্ববিদ্যালয়ের ভর্তি পরীক্ষার তারিখের সঙ্গে সামঞ্জস্য। তার মানে জাবির পরীক্ষা-কেন্দ্র আবারো থাকবে ক্যাম্পাসকেন্দ্রিক।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কখন স্থির হবে সব", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব মিলবে ২৮ অক্টোবরের ভর্তি পরীক্ষা কমিটির বৈঠকে — সেখানেই পরীক্ষার তারিখ ও সময়সীমা চূড়ান্ত হবে। প্রতিবেদনটি হালনাগাদ হয়েছে ১৫ অক্টোবরে, তাই এটাই সবচেয়ে টাটকা চিত্র। আবেদন শুরুর তারিখ, ফি, মার্কিং স্কিম — বৈঠকের পরেই যা যা স্পষ্ট হচ্ছে, শিক্ষা২৪ তার ধাপে ধাপে ভাঙলে রাখব এখানে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাবি টার্গেট করা শিক্ষার্থীদের বলি — যাতায়াত-থাকার হিসাবটা ডিসেম্বরের মধ্যেই করে ফেলুন, ধরে নিন কেন্দ্র ঢাকার রাস্তার ওপাশে সাভারে। আর প্রস্তুতির প্রাথমিক সময়সীমা ধরুন ১৭ জানুয়ারি। ২৮ অক্টোবরের বৈঠকের খবর পরিষ্কার হলে আমরা তোলা রাখব — আবেদনের টাইমলাইনসহ।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.prothomalo.com/education/admission/bluk8d16uu", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "প্রথম আলো", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	t	t	f	\N	f	\N	ju-admission-exam-2026-27	13	6	1	approved	\N	2026-10-15 22:36:54.1+00	1	2026-10-27 06:35:02.8+00	2026-10-27 06:35:02.8+00	published
6	এইচএসসি ফলাফল সম্ভাব্য ২৫–২৯ অক্টোবর — ১২ লাখ ৭০ হাজার পরীক্ষার্থীর ধৈর্য্যের হিসাব	\N	এইচএসসি ও সমমানের ফলাফল ২০২৬ প্রকাশের সম্ভাব্য জানালা ২৫–২৯ অক্টোবর, জানিয়েছে বোর্ড সমন্বয় কমিটি। পরীক্ষার্থী সাড়ে ১২ লাখ — সর্বশেষ হালনাগাদ।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তারিখ কেন এগিয়ে আসছে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আগের পরিকল্পনায় ফল প্রকাশের জানালা ছিল ১ থেকে ১৫ নভেম্বর। এখন সেটা এগিয়ে আসছে — কারণ তিন বোর্ডের বাকি কাজ পথ পেয়েছে। বন্যার কারণে পেছানো চট্টগ্রাম বোর্ডের পরীক্ষা শেষ হয়েছিল ৯ সেপ্টেম্বরে; ওই বোর্ডের পাশাপাশি মাদ্রাসা ও কারিগরি শিক্ষা বোর্ডের খাতা দেখার কাজও এখন শেষ সীমায়। সব খাতা জমা পড়লে ফল প্রকাশনার বিভাগ তারিখ বসাবে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "এবারের হিসাবটা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৯টি সাধারণ শিক্ষা বোর্ড, মাদ্রাসা আর কারিগরি শিক্ষা বোর্ড মিলিয়ে নিবন্ধিত পরীক্ষার্থী ১২ লাখ ৭০ হাজার ৫৮৩ জন। পরীক্ষা শুরু হয়েছিল ২ জুলাই, মূল পর্ব শেষ ৮ আগস্টে। দুই মাসের অপেক্ষা তো এখন জমেছে — আর ফলের পর সামনে বিশ্ববিদ্যালয় ভর্তির মৌসুম, তাই এই এক সপ্তাহটা কাউকে নিশ্চিহ্ন ব্যবধান দিচ্ছে না।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "২৫–২৯ অক্টোবর ধরে সাজে চকচকে — তবে চূড়ান্ত তারিখ বোর্ড ঘোষণা করলে তবেই প্যাকেট। ফল প্রকাশের দিনের সকালে এই পাতাতেই পাবেন ওয়েবসাইট-এসএমএস দিয়ে রেজাল্ট দেখার ধাপে ধাপে নিয়ম, প্রতিটি বোর্ডের লিংকসহ। স্কুল-পত্র ওঠার আগে কোনো 'লিকড' তালিকায় টাকা না শোধরিয়ে অপেক্ষা করুন — মিথ্যা বিভ্রান্তি প্রতিবছরই ছড়ায়।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/hsc-results-in-the-last-week-of-this-month-387347", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	hsc-result-2026-possible-date	14	8	1	approved	\N	2026-10-15 22:36:54.002+00	1	2026-10-27 06:35:03.434+00	2026-10-27 06:35:03.434+00	published
7	এনইউ নিয়মিত মাস্টার্সে আবেদন শুরু — ফরম ১৫ নভেম্বর, ফি ১৬ নভেম্বর পর্যন্ত	\N	জাতীয় বিশ্ববিদ্যালয়ে ২০২৪-২৫ শিক্ষাবর্ষের নিয়মিত মাস্টার্সে প্রাথমিক আবেদন চলছে। ফরম পূরণের শেষ ১৫ নভেম্বর, ফি ১ হাজার টাকা, ক্লাস ১০ ডিসেম্বর — পুরো সময়চক্র।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আবেদন করবেন যেভাবে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বিজ্ঞপ্তিটা এসেছে সোমবার। শিক্ষার্থীদের প্রাথমিক আবেদন ফরম পূরণ করতে হবে জাতীয় বিশ্ববিদ্যালয়ের ভর্তি-ওয়েবসাইটে। ধাপে ধাপে নির্দেশিকা পাওয়া যাবে সেখানকার 'Prospectus/Important Notice' অপশনে — ফরম ভরার আগে ওটা একবার পড়ে নিলে পরে সংশোধনের ঝামেলা থাকবে না।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফি দেবেন কোথায়, কীভাবে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আবেদন ফি ১ হাজার টাকা। জমা দেওয়া যাবে নিজ নিজ কলেজে — কলেজ-নির্ধারিত মোবাইল ব্যাংকিংয়ের মাধ্যমে বা সরাসরি। কিন্তু খেয়াল রাখুন, ফরম আর ফি-এর সময়সীমা আলাদা: ফরমের দরজা বন্ধ হয় ১৫ নভেম্বর মধ্যরাতে, ফি পাওয়া যাবে ১৬ নভেম্বর পর্যন্ত। ফরম ভরে ফি না দিলে আবেদন আসলে আবেদনই থাকবে না।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তিনটা তারিখ ফোনের ক্যালেন্ডারে সেভ করুন — ১৫, ১৬ নভেম্বর আর ১০ ডিসেম্বর। ফরমে কলেজ-রোল, সেশন, বিষয়ের তথ্য একবার বোর্ড-সনদের সঙ্গে মিলিয়ে ভরুন। আর যাঁরা চাকরির সঙ্গে মাস্টার্স চালান, তাঁদের জন্য ক্লাস শুরু ১০ ডিসেম্বর — পরিকল্পনা সেভাবেই সাজান।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/applications-for-masters-admission-at-the-national-university-begin-tomorrow-387453", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	nu-masters-admission-2024-25	15	5	1	approved	\N	2026-10-15 22:36:53.894+00	1	2026-10-27 06:35:04.106+00	2026-10-27 06:35:04.102+00	published
8	ইবতেদায়ি ৫ম ও দাখিল ৮ম বৃত্তি পরীক্ষার কেন্দ্রতালিকা প্রকাশ — সংশোধনীর শেষ ১৭ অক্টোবর	\N	২০২৬ সালের ইবতেদায়ি ৫ম ও দাখিল ৮ম বৃত্তি পরীক্ষার কেন্দ্রের তালিকা প্রকাশ করেছে মাদ্রাসা শিক্ষা বোর্ড। নামে ভুল থাকলে সংশোধনীর শেষ সময় ১৭ অক্টোবর।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কোন তালিকা, কোথায়", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বোর্ডের এক চিঠিতে জানানো হয়েছে, ২০২৬ শিক্ষাবর্ষের ইবতেদায়ি ৫ম ও দাখিল ৮ম শ্রেণির বৃত্তি পরীক্ষার কেন্দ্রগুলো কেন্দ্রস্থিত মাদ্রাসার নামসহ প্রকাশ করা হয়েছে। মানে তালিকা মানে শুধু জেলা-শহরের নাম নয় — পরীক্ষাটা কোন মাদ্রাসায় বসবে, সেটাই মূল যাচাইয়ের বিষয়।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "নামে ভুল থাকলে করণীয়", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কেন্দ্রস্থিত মাদ্রাসার নামে কোনো ভুল বা সংশোধন দরকার হলে আবেদন করতে হবে লিখিতভাবে, ইমেইলে — সরাসরি মাদ্রাসা শিক্ষা বোর্ড চেয়ারম্যানের দপ্তরে। সময়সীমা ১৭ অক্টোবর। দিন দশেক পরে ফোন করে জানানোর জায়গা এখানে নেই — সীমা পার হলে তালিকাই টিকবে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আজই করুন দুটো কাজ: আপনার মাদ্রাসার নাম তালিকায় বানান-আকার মিলিয়ে দেখুন, আর কেন্দ্র কোথায় সেটা নোট করে রাখুন। ত্রুটি চোখে পড়লে দলিল-প্রমাণসহ আবেদনটা ইমেইলে পাঠান — ১৭ অক্টোবরের আগে। বৃত্তি পরীক্ষার রুটিন-সিলেবাস প্রকাশ হলে আমরাও এই পাতায় সাজিয়ে রাখব।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/see-the-list-of-ebtedayi-5th-and-dakhil-8th-grade-scholarship-examination-centers-387509", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	madrasah-scholarship-exam-centres-2026	16	7	1	approved	\N	2026-10-15 22:36:53.749+00	1	2026-10-27 06:35:04.911+00	2026-10-27 06:35:04.911+00	published
9	৪৫তম বিসিএসের প্রজ্ঞাপন জারি: ১ হাজার ৭০২ প্রার্থী এবার ক্যাডার — যোগদানের শেষ সময় ১ নভেম্বর	\N	৪৫তম বিসিএসে ১,৭০২ জনকে ৯ম গ্রেডে নিয়োগ দিয়ে প্রজ্ঞাপন জারি করেছে জনপ্রশাসন মন্ত্রণালয়। যোগদানের শেষ তারিখ ১ নভেম্বর — না করলে নিয়োগ বাতিল।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "প্রজ্ঞাপনে কী লেখা আছে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বুধবার জারি হওয়া প্রজ্ঞাপনে বলা হয়েছে, বিসিএসের বিভিন্ন ক্যাডারের প্রবেশ পদে পিএসসির সুপারিশক্রমে নিয়োগ দেওয়া হয়েছে। সুপারিশের চিঠি পিএসসি পাঠিয়েছিল ১৪ ডিসেম্বর ২০২৫-এ — তার পর মন্ত্রণালয়ের ঘরে ঘুরে ঘুরে এসে পৌঁছেছে প্রজ্ঞাপন। সবাই ৯ম গ্রেডে; জাতীয় বেতনস্কেল-২০২৬ অনুযায়ী শুরুটা ৪৪ হাজার টাকা, ধাপে ধাপে সর্বোচ্চ ১ লাখ ৫ হাজার ৯০০।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তারিখটা কেন এত গুরুত্বপূর্ণ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "নিয়োগের শর্তাবলি গ্রহণ করলে ১ নভেম্বরের মধ্যে আপনার ক্যাডারের নিয়ন্ত্রক মন্ত্রণালয় বা বিভাগের নির্ধারিত কার্যালয়ে কায়েম হতে হবে। আর সেদিনের মধ্যে যোগদান না করলে? প্রজ্ঞাপন স্পষ্ট — প্রার্থীকে অসম্মত ধরে নিয়ে নিয়োগপত্র বাতিল মনে করা হবে। মানে মিস করা মানে শুধু দেরি নয়, বিসিএসের চার বছর ফেরৎ যাওয়া।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "প্রজ্ঞাপনটা নিজের চোখে পড়ুন, শর্তাবলিতে সই-এর আগে প্রতিটি লাইন দেখুন। কোন অফিসে যোগদান দিতে হবে সেটা আপনার ক্যাডার বরাদ্দ অনুযায়ী আলাদা — ওপরের নথির সঙ্গেই কার্যালয়ের নাম থাকবে। যাতায়াত-থাকার ব্যবস্থা ১ নভেম্বরের আগেই গুছিয়ে ফেলুন; দেরির বখশিশ এই প্রজ্ঞাপনে নেই।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/gazette-notification-issued-appointing-1702-candidates-to-the-45th-bcs-387577", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	45th-bcs-appointment-notice	17	1	1	approved	\N	2026-10-15 22:36:53.637+00	1	2026-10-27 06:35:05.674+00	2026-10-27 06:35:05.674+00	published
1	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	\N	জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাতীয় বিশ্ববিদ্যালয়ের দ্বিতীয় সমাবর্তনে অংশগ্রহণের জন্য প্রকাশিত বিজ্ঞপ্তি অনুযায়ী ১৬টি ক্যাটাগরির উত্তীর্ণ শিক্ষার্থী ও গবেষকগণ রেজিস্ট্রেশন করতে পারবেন:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতক (পাস ও সম্মান): ২০১৩ থেকে ২০২৪ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• স্নাতকোত্তরের বিভিন্ন বিষয়: ২০১৩ থেকে ২০২৩ সাল পর্যন্ত উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• গবেষকবৃন্দ (এমফিল ও পিএইচডি): ২০১৬ থেকে ২০২৫ সালের মধ্যে ডিগ্রি অর্জনকারী গবেষকগণ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনক্যাম্পাস প্রোগ্রাম: অনক্যাম্পাস প্রোগ্রামের উত্তীর্ণ শিক্ষার্থীবৃন্দ।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গুরুত্বপূর্ণ তথ্যাবলি:", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• অনলাইন রেজিস্ট্রেশনের সময়সীমা: আগামী ১২ অক্টোবর থেকে ১২ নভেম্বর পর্যন্ত অনলাইনে নিবন্ধন সম্পন্ন করতে হবে।", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}, {"type": "paragraph", "format": "start", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "• রেজিস্ট্রেশন ফি: অংশগ্রহণের জন্য মূল ফি ৪,০০০ টাকা নির্ধারণ করা হয়েছে", "type": "text", "style": "", "detail": 0, "format": 0, "version": 1}], "textStyle": "", "textFormat": 0}]}}	standard	youtube	\N	8	1	f	f	f	\N	f	\N	post-vkcnas	1	8	1	approved	\N	2026-10-26 08:25:43.4+00	1	2026-10-27 14:28:47.414+00	2026-10-27 06:35:00.715+00	published
4	একনজরে এই সপ্তাহের শিক্ষা সংবাদ: ফলাফল থেকে বৃত্তি — ৭টি আপডেট একসাথে	\N	৭টি বড় শিক্ষা আপডেট এক ক্লিকে: মাউশির ব্যাংক হিসাব সংশোধন, HSC ফলাফলের সম্ভাব্য দিন, ৪৫তম বিসিএস ক্যাডার, জাবি ভর্তির সময়সূচি, স্কুল ভর্তি নীতিমালা, মাদ্রাসা বৃত্তির কেন্দ্রতালিকা ও জাবি মাস্টার্সের আবেদন।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৭ দিনে শিক্ষাঙ্গনে যা ঘুরেছে: বিসিএস ক্যাডার প্রজ্ঞাপন, HSC-র ফলাফলের আঁচ আর স্কুলে ভর্তির নীতিমাল। এক জায়গায় সব, প্রতিটির পেছনে আমাদের পূর্ণ প্রতিবেদন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বৃত্তি ও ব্যাংক হিসাব", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ইবতেদায়ি ৫ম ও দাখিল ৮ম বৃত্তি পরীক্ষার ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/scholarship/8/madrasah-scholarship-exam-centres-2026", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "কেন্দ্রতালিকা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " প্রকাশ পেয়েছে; সংশোধনীর শেষ সময় ১৭ অক্টোবর।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফলাফল ও পরীক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "এইচএসসির ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/education-news/6/hsc-result-2026-possible-date", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ফলাফল সম্ভাব্য ২৫–২৯ অক্টোবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " — ১২ লাখ ৭০ হাজার পরীক্ষার্থীর জন্য এই সপ্তাহটাই সিদ্ধান্তের।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "৪৫তম ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/jobs-career/9/45th-bcs-appointment-notice", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "বিসিএসের প্রজ্ঞাপন", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " জারি: ১ হাজার ৭০২ প্রার্থী ক্যাডারে, যোগদানের শেষ ১ নভেম্বর।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তি ও নীতিমালা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাবি ভর্তি পরীক্ষা প্রাথমিকভাবে ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/admission/5/ju-admission-exam-2026-27", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "১৭–২৮ জানুয়ারি", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " — চূড়ান্ত প্রজ্ঞাপন ২৮ অক্টোবরে; বিভাগীয় শহরের সুযোগ নিয়ে প্রশ্ন থেকেই গেল।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সরকারি স্কুলে ভর্তির ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/admission/10/admission-policy-2027", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "নীতিমালা-২০২৭", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " প্রকাশ: ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "জাতীয় বিশ্ববিদ্যালয়ের নিয়মিত ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/university/7/nu-masters-admission-2024-25", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মাস্টার্সে আবেদন", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " শুরু — ফরমপূরণ ১৫ নভেম্বর পর্যন্ত।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "প্রতিটি প্রতিবেদন নিয়মিত হালনাগাদ হয়। সপ্তাহজুড়ে নতুন সংবাদের জন্য ফলো করুন ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikkha24.com/latest", "newTab": false, "linkType": "custom"}, "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা২৪.কম — লেটেস্ট", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"mode": "normal", "text": " পাতায়।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	t	১৮ অক্টোবর সংশোধন: এই সংকলনের আগের সংস্করণে মাউশি বৃত্তির ব্যাংক হিসাব সংশোধন সংক্রান্ত একটি অনুচ্ছেদ ছিল, যার পূর্ণ প্রতিবেদন এখনো প্রকাশিত হয়নি। যাচাইযোগ্য সূত্র ছাড়া দাবি রাখা আমাদের নীতির বাইরে, তাই অনুচ্ছেদটি সরিয়ে নেওয়া হয়েছে। প্রতিবেদনটি প্রকাশ হলে এখানে যুক্ত করা হবে।	weekly-digest-2026-10-17	\N	8	1	approved	\N	2026-10-17 22:20:20+00	1	2026-10-27 06:35:02.281+00	2026-10-27 06:35:02.281+00	published
10	সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ — ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে	\N	সরকারি মাধ্যমিকে ভর্তির নীতিমালা-২০২৭ জারি হয়েছে। ঢাকায় ৪০% ক্যাচমেন্ট, ৫ কোটায় ১৪% আসন, ১ম শ্রেণিতে লটারি ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা — অভিভাবকদের জন্য এক পাতায় পুরো হিসাব।	{"root": {"type": "root", "format": "", "indent": 0, "version": 1, "children": [{"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "মূল খবর", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "গজরীর নিয়মে এবার ভর্তির দরজা খুলবে তিন দরজা দিয়ে। প্রথম দরজা ক্যাচমেন্ট: ঢাকা মহানগরীর সরকারি বিদ্যালয়গুলোতে আসনের ৪০ শতাংশ থাকবে স্কুলের চারপাশের এলাকার শিশুদের জন্য। কোন ঠিকানা কোন স্কুলে পড়বে, তার নকশা আঁকবে মাধ্যমিক ও উচ্চ শিক্ষা অধিদপ্তর। বাকি ৬০ শতাংশ — ওপেন, যে কেউ লড়তে পারবেন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "দ্বিতীয় দরজা কোটা। নীতিমালার ১৭ ধারায় পাঁচ রকম সংরক্ষণ, মোট ১৪ শতাংশ: মুক্তিযোদ্ধা ও শহীদ মুক্তিযোদ্ধার সন্তানদের ৫ শতাংশ, সহোদর–সহোদরাদের ৩ শতাংশ, যমজ ভাই–বোনদের ২ শতাংশ, বিশেষ চাহিদাসম্পন্নদের ২ শতাংশ, আর মন্ত্রণালয়-দপ্তর-সংস্থার কর্মীদের সন্তানদের ২ শতাংশ (১+১)।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ছোট হিসাব, বড় ফাঁদ: সহোদর আর যমজ কোটার সুযোগ এক পরিবারের সর্বোচ্চ তিন সন্তান পর্যন্ত। আর কোনো কোটায় যোগ্য প্রার্থী না মিললে আসন খালি রাখা যাবে না — নিয়ম মেনে উন্মুক্ত পুলে যোগ হয়ে যাবে। মুক্তিযোদ্ধা কোটায় আবেদনের সময় সত্যায়িত কপি দিতে হবে, ভর্তির দিন দেখাতে হবে মূল কপি।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "তৃতীয় দরজা পরীক্ষা আর লটারি। ১ম শ্রেণিতে শিশু পরীক্ষার চাপ না পায় — থাকবে ডিজিটাল লটারি। ২য় থেকে ৯ম শ্রেণি? ভর্তি পরীক্ষা। আর ৬ষ্ঠ শ্রেণিতে একটা আলাদা সুবিধা আছে: স্বতন্ত্র সরকারি প্রাথমিক থেকে পঞ্চম শ্রেণি পাস করা শিশুদের জন্য মোট আসনের ১০ শতাংশ আলাদা করে রাখা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আদালতের যে প্রেক্ষাপটটা জানা দরকার", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সব স্কুলে ভর্তি পরীক্ষা বাতিলের দাবিতে ৭ অক্টোবর হাইকোর্টে রিটও করা হয়েছিল। দেওয়ানি উত্তেজনা — কিন্তু ১৪ অক্টোবর অবকাশকালীন বেঞ্চ রিটটা কার্যতালিকা থেকে বাদ দিয়ে দিয়েছে, নিয়মিত বেঞ্চে যেতে বলে। মানে আপাতত সরকারের নিয়মই দাঁড়িয়ে: এক নম্বর ক্লাসে লটারি, বাকিতে পরীক্ষা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"tag": "h2", "type": "heading", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "আপনার জন্য মানে", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "ভর্তির বিজ্ঞপ্তি আসার আগেই তিনটা কাজ করে ফেলুন: বাসার ঠিকানা কোন স্কুলের ক্যাচমেন্টে পড়ে সেটা যাচাই করুন (অধিদপ্তরের তালিকা প্রকাশ হলে আমরা জানাব এখানেই)। কোটার দাবি থাকলে কাগজপত্র গুছিয়ে রাখুন — বিশেষ করে মুক্তিযোদ্ধা সনদ। আর ৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারির ছেলেমেয়ে? ওদের তো ১০ শতাংশ দরজা আলাদাই খোলা।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}, {"type": "paragraph", "format": "", "indent": 0, "version": 1, "children": [{"mode": "normal", "text": "সূত্র: ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://shikshasangbad.com/secondary/22984/", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "শিক্ষা সংবাদ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/five-types-of-quotas-for-school-admission-14-percent-of-seats-reserved-387498", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": ", ", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}, {"type": "link", "fields": {"url": "https://www.dainikshiksha.com/bn/news/writ-petition-seeking-cancellation-of-school-admission-test-removed-from-the-cause-list-387495", "newTab": true, "linkType": "custom"}, "version": 1, "children": [{"mode": "normal", "text": "দৈনিক শিক্ষা (রিট)", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}]}, {"mode": "normal", "text": " — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।", "type": "text", "diets": [], "style": "", "detail": 0, "format": 0, "version": 1}], "direction": "ltr"}], "direction": "ltr"}}	standard	youtube	\N	\N	\N	f	f	f	\N	f	\N	admission-policy-2027	18	6	1	approved	\N	2026-10-15 22:36:53.513+00	1	2026-10-27 13:23:58.133+00	2026-10-27 06:35:06.171+00	published
\.


--
-- Data for Name: articles_key_takeaways; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.articles_key_takeaways (_order, _parent_id, id, point) FROM stdin;
1	5	6ad155868e8c14fb40ca16ff	প্রাথমিক পরিকল্পনা: ভর্তি পরীক্ষা ১৭–২৮ জানুয়ারি
2	5	6ad155868e8c14fb40ca1700	চূড়ান্ত তারিখ-সময়সীমা হবে ২৮ অক্টোবরের কমিটি বৈঠকে
3	5	6ad155868e8c14fb40ca1701	বিভাগীয় শহরে পরীক্ষার সম্ভাবনা কম — উপকমিটির প্রতিবেদন বিরুদ্ধ
4	5	6ad155868e8c14fb40ca1702	কারণ: খরচ, আর অন্যান্য বিশ্ববিদ্যালয়ের তারিখের সঙ্গে সমন্বয়
5	5	6ad155868e8c14fb40ca1703	বক্তব্য: ভর্তি কমিটির সদস্য সচিব সৈয়দ মোহাম্মদ আলী রেজা
1	6	6ad155868e8c14fb40ca16fa	ফল প্রকাশের সম্ভাব্য জানালা ২৫–২৯ অক্টোবর (সমন্বয় কমিটির কর্মকর্তা, ১২ অক্টোবর)
2	6	6ad155868e8c14fb40ca16fb	আগের লক্ষ্যমাত্রা ছিল ১–১৫ নভেম্বর — তারিখ এগিয়ে আসছে
3	6	6ad155868e8c14fb40ca16fc	কারণ: চট্টগ্রাম, মাদ্রাসা ও কারিগরি বোর্ডের খাতা দেখা সম্ভব হচ্ছে
4	6	6ad155868e8c14fb40ca16fd	পরীক্ষার্থী ১২ লাখ ৭০ হাজার ৫৮৩ জন
5	6	6ad155868e8c14fb40ca16fe	চূড়ান্ত তারিখ জানাব বোর্ডগুলো — ঘোষণার আগে সংখ্যা ধরে রাখা যাবে না
1	7	6ad155858e8c14fb40ca16f6	প্রাথমিক আবেদন: ১৪ অক্টোবর বিকেল ৪টা থেকে ১৫ নভেম্বর রাত ১২টা
2	7	6ad155858e8c14fb40ca16f7	আবেদন ফি ১,০০০ টাকা — ফি জমার শেষ ১৬ নভেম্বর
3	7	6ad155858e8c14fb40ca16f8	ফরম পূরণ www.nu.ac.bd/admissions-এ
4	7	6ad155858e8c14fb40ca16f9	ক্লাস শুরু ১০ ডিসেম্বর; বিজ্ঞপ্তি জারি ১২ অক্টোবর
1	8	6ad155858e8c14fb40ca16f2	কেন্দ্রের তালিকা প্রকাশ কেন্দ্রস্থিত মাদ্রাসার নামসহ
2	8	6ad155858e8c14fb40ca16f3	সংশোধনীর শেষ সময় ১৭ অক্টোবর
3	8	6ad155858e8c14fb40ca16f4	আবেদন যাবে ইমেইলে — বোর্ড চেয়ারম্যানের দপ্তরে
4	8	6ad155858e8c14fb40ca16f5	বোর্ডের চিঠিতে তথ্যটি জানানো হয়; প্রতিবেদন প্রকাশ ১৪ অক্টোবর
1	9	6ad155858e8c14fb40ca16ed	প্রজ্ঞাপন জারি ১৪ অক্টোবর, জনপ্রশাসন মন্ত্রণালয়
2	9	6ad155858e8c14fb40ca16ee	নিয়োগ ১ হাজার ৭০২ জন, বিভিন্ন ক্যাডারের প্রবেশ পদে
3	9	6ad155858e8c14fb40ca16ef	৯ম গ্রেড — মূল বেতন ৪৪ হাজার, সর্বোচ্চ ১ লাখ ৫ হাজার ৯০০ টাকা
4	9	6ad155858e8c14fb40ca16f0	পিএসসির সুপারিশ ছিল ১৪ ডিসেম্বর ২০২৫-র চিঠিতে
5	9	6ad155858e8c14fb40ca16f1	যোগদানের শেষ সময় ১ নভেম্বর; না গেলে নিয়োগ বাতিল
1	10	6ad155858e8c14fb40ca16e8	নীতিমালা জারি ১৩ অক্টোবর; সই উপসচিব তানিয়া ফেরদৌসের
2	10	6ad155858e8c14fb40ca16e9	ঢাকা মহানগরে ৪০% আসন ক্যাচমেন্টের জন্য, ৬০% উন্মুক্ত
3	10	6ad155858e8c14fb40ca16ea	১ম শ্রেণিতে ডিজিটাল লটারি, ২য়–৯ম শ্রেণিতে ভর্তি পরীক্ষা
4	10	6ad155858e8c14fb40ca16eb	৫ কোটায় মোট ১৪% সংরক্ষিত আসন
5	10	6ad155858e8c14fb40ca16ec	৬ষ্ঠ শ্রেণিতে সরকারি প্রাইমারি-উত্তীর্ণদের জন্য আলাদা ১০%
\.


--
-- Data for Name: articles_photo_story; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.articles_photo_story (_order, _parent_id, id, image_id, caption, credit, full_bleed) FROM stdin;
\.


--
-- Data for Name: articles_rels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.articles_rels (id, "order", parent_id, path, levels_id, districts_id, tags_id) FROM stdin;
3	1	3	level	3	\N	\N
4	1	3	tags	\N	\N	30
5	1	4	tags	\N	\N	30
6	2	4	tags	\N	\N	28
7	3	4	tags	\N	\N	26
8	4	4	tags	\N	\N	25
9	1	5	level	2	\N	\N
10	1	6	level	3	\N	\N
11	1	7	level	1	\N	\N
12	1	8	level	5	\N	\N
13	2	8	level	4	\N	\N
18	1	10	level	4	\N	\N
19	2	10	level	5	\N	\N
20	1	1	level	1	\N	\N
21	1	1	district	\N	64	\N
\.


--
-- Data for Name: articles_timeline_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.articles_timeline_milestones (_order, _parent_id, id, date, title, detail) FROM stdin;
\.


--
-- Name: _articles_v_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public._articles_v_id_seq', 16, true);


--
-- Name: _articles_v_rels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public._articles_v_rels_id_seq', 29, true);


--
-- Name: _articles_v_version_key_takeaways_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public._articles_v_version_key_takeaways_id_seq', 53, true);


--
-- Name: _articles_v_version_photo_story_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public._articles_v_version_photo_story_id_seq', 1, false);


--
-- Name: _articles_v_version_timeline_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public._articles_v_version_timeline_milestones_id_seq', 1, false);


--
-- Name: articles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.articles_id_seq', 10, true);


--
-- Name: articles_rels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.articles_rels_id_seq', 21, true);


--
-- Name: _articles_v _articles_v_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v
    ADD CONSTRAINT _articles_v_pkey PRIMARY KEY (id);


--
-- Name: _articles_v_rels _articles_v_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_rels
    ADD CONSTRAINT _articles_v_rels_pkey PRIMARY KEY (id);


--
-- Name: _articles_v_version_key_takeaways _articles_v_version_key_takeaways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_key_takeaways
    ADD CONSTRAINT _articles_v_version_key_takeaways_pkey PRIMARY KEY (id);


--
-- Name: _articles_v_version_photo_story _articles_v_version_photo_story_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_photo_story
    ADD CONSTRAINT _articles_v_version_photo_story_pkey PRIMARY KEY (id);


--
-- Name: _articles_v_version_timeline_milestones _articles_v_version_timeline_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_timeline_milestones
    ADD CONSTRAINT _articles_v_version_timeline_milestones_pkey PRIMARY KEY (id);


--
-- Name: articles_key_takeaways articles_key_takeaways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_key_takeaways
    ADD CONSTRAINT articles_key_takeaways_pkey PRIMARY KEY (id);


--
-- Name: articles_photo_story articles_photo_story_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_photo_story
    ADD CONSTRAINT articles_photo_story_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: articles_rels articles_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_rels
    ADD CONSTRAINT articles_rels_pkey PRIMARY KEY (id);


--
-- Name: articles_timeline_milestones articles_timeline_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_timeline_milestones
    ADD CONSTRAINT articles_timeline_milestones_pkey PRIMARY KEY (id);


--
-- Name: _articles_v_autosave_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_autosave_idx ON public._articles_v USING btree (autosave);


--
-- Name: _articles_v_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_created_at_idx ON public._articles_v USING btree (created_at);


--
-- Name: _articles_v_latest_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_latest_idx ON public._articles_v USING btree (latest);


--
-- Name: _articles_v_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_parent_idx ON public._articles_v USING btree (parent_id);


--
-- Name: _articles_v_rels_districts_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_rels_districts_id_idx ON public._articles_v_rels USING btree (districts_id);


--
-- Name: _articles_v_rels_levels_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_rels_levels_id_idx ON public._articles_v_rels USING btree (levels_id);


--
-- Name: _articles_v_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_rels_order_idx ON public._articles_v_rels USING btree ("order");


--
-- Name: _articles_v_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_rels_parent_idx ON public._articles_v_rels USING btree (parent_id);


--
-- Name: _articles_v_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_rels_path_idx ON public._articles_v_rels USING btree (path);


--
-- Name: _articles_v_rels_tags_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_rels_tags_id_idx ON public._articles_v_rels USING btree (tags_id);


--
-- Name: _articles_v_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_updated_at_idx ON public._articles_v USING btree (updated_at);


--
-- Name: _articles_v_version_key_takeaways_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_key_takeaways_order_idx ON public._articles_v_version_key_takeaways USING btree (_order);


--
-- Name: _articles_v_version_key_takeaways_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_key_takeaways_parent_id_idx ON public._articles_v_version_key_takeaways USING btree (_parent_id);


--
-- Name: _articles_v_version_photo_story_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_photo_story_image_idx ON public._articles_v_version_photo_story USING btree (image_id);


--
-- Name: _articles_v_version_photo_story_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_photo_story_order_idx ON public._articles_v_version_photo_story USING btree (_order);


--
-- Name: _articles_v_version_photo_story_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_photo_story_parent_id_idx ON public._articles_v_version_photo_story USING btree (_parent_id);


--
-- Name: _articles_v_version_timeline_milestones_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_timeline_milestones_order_idx ON public._articles_v_version_timeline_milestones USING btree (_order);


--
-- Name: _articles_v_version_timeline_milestones_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_timeline_milestones_parent_id_idx ON public._articles_v_version_timeline_milestones USING btree (_parent_id);


--
-- Name: _articles_v_version_version__status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version__status_idx ON public._articles_v USING btree (version__status);


--
-- Name: _articles_v_version_version_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_author_idx ON public._articles_v USING btree (version_author_id);


--
-- Name: _articles_v_version_version_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_category_idx ON public._articles_v USING btree (version_category_id);


--
-- Name: _articles_v_version_version_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_created_at_idx ON public._articles_v USING btree (version_created_at);


--
-- Name: _articles_v_version_version_featured_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_featured_image_idx ON public._articles_v USING btree (version_featured_image_id);


--
-- Name: _articles_v_version_version_is_breaking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_is_breaking_idx ON public._articles_v USING btree (version_is_breaking);


--
-- Name: _articles_v_version_version_is_lead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_is_lead_idx ON public._articles_v USING btree (version_is_lead);


--
-- Name: _articles_v_version_version_is_sponsored_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_is_sponsored_idx ON public._articles_v USING btree (version_is_sponsored);


--
-- Name: _articles_v_version_version_layout_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_layout_idx ON public._articles_v USING btree (version_layout);


--
-- Name: _articles_v_version_version_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_published_at_idx ON public._articles_v USING btree (version_published_at);


--
-- Name: _articles_v_version_version_review_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_review_status_idx ON public._articles_v USING btree (version_review_status);


--
-- Name: _articles_v_version_version_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_slug_idx ON public._articles_v USING btree (version_slug);


--
-- Name: _articles_v_version_version_subcategory_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_subcategory_idx ON public._articles_v USING btree (version_subcategory_id);


--
-- Name: _articles_v_version_version_title_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_title_idx ON public._articles_v USING btree (version_title);


--
-- Name: _articles_v_version_version_university_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_university_idx ON public._articles_v USING btree (version_university_id);


--
-- Name: _articles_v_version_version_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _articles_v_version_version_updated_at_idx ON public._articles_v USING btree (version_updated_at);


--
-- Name: articles__status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles__status_idx ON public.articles USING btree (_status);


--
-- Name: articles_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_author_idx ON public.articles USING btree (author_id);


--
-- Name: articles_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_category_idx ON public.articles USING btree (category_id);


--
-- Name: articles_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_created_at_idx ON public.articles USING btree (created_at);


--
-- Name: articles_featured_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_featured_image_idx ON public.articles USING btree (featured_image_id);


--
-- Name: articles_is_breaking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_is_breaking_idx ON public.articles USING btree (is_breaking);


--
-- Name: articles_is_lead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_is_lead_idx ON public.articles USING btree (is_lead);


--
-- Name: articles_is_sponsored_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_is_sponsored_idx ON public.articles USING btree (is_sponsored);


--
-- Name: articles_key_takeaways_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_key_takeaways_order_idx ON public.articles_key_takeaways USING btree (_order);


--
-- Name: articles_key_takeaways_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_key_takeaways_parent_id_idx ON public.articles_key_takeaways USING btree (_parent_id);


--
-- Name: articles_layout_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_layout_idx ON public.articles USING btree (layout);


--
-- Name: articles_photo_story_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_photo_story_image_idx ON public.articles_photo_story USING btree (image_id);


--
-- Name: articles_photo_story_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_photo_story_order_idx ON public.articles_photo_story USING btree (_order);


--
-- Name: articles_photo_story_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_photo_story_parent_id_idx ON public.articles_photo_story USING btree (_parent_id);


--
-- Name: articles_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_published_at_idx ON public.articles USING btree (published_at);


--
-- Name: articles_rels_districts_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_rels_districts_id_idx ON public.articles_rels USING btree (districts_id);


--
-- Name: articles_rels_levels_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_rels_levels_id_idx ON public.articles_rels USING btree (levels_id);


--
-- Name: articles_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_rels_order_idx ON public.articles_rels USING btree ("order");


--
-- Name: articles_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_rels_parent_idx ON public.articles_rels USING btree (parent_id);


--
-- Name: articles_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_rels_path_idx ON public.articles_rels USING btree (path);


--
-- Name: articles_rels_tags_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_rels_tags_id_idx ON public.articles_rels USING btree (tags_id);


--
-- Name: articles_review_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_review_status_idx ON public.articles USING btree (review_status);


--
-- Name: articles_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX articles_slug_idx ON public.articles USING btree (slug);


--
-- Name: articles_subcategory_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_subcategory_idx ON public.articles USING btree (subcategory_id);


--
-- Name: articles_timeline_milestones_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_timeline_milestones_order_idx ON public.articles_timeline_milestones USING btree (_order);


--
-- Name: articles_timeline_milestones_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_timeline_milestones_parent_id_idx ON public.articles_timeline_milestones USING btree (_parent_id);


--
-- Name: articles_title_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_title_idx ON public.articles USING btree (title);


--
-- Name: articles_university_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_university_idx ON public.articles USING btree (university_id);


--
-- Name: articles_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_updated_at_idx ON public.articles USING btree (updated_at);


--
-- Name: _articles_v _articles_v_parent_id_articles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v
    ADD CONSTRAINT _articles_v_parent_id_articles_id_fk FOREIGN KEY (parent_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: _articles_v_rels _articles_v_rels_districts_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_rels
    ADD CONSTRAINT _articles_v_rels_districts_fk FOREIGN KEY (districts_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: _articles_v_rels _articles_v_rels_levels_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_rels
    ADD CONSTRAINT _articles_v_rels_levels_fk FOREIGN KEY (levels_id) REFERENCES public.levels(id) ON DELETE CASCADE;


--
-- Name: _articles_v_rels _articles_v_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_rels
    ADD CONSTRAINT _articles_v_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public._articles_v(id) ON DELETE CASCADE;


--
-- Name: _articles_v_rels _articles_v_rels_tags_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_rels
    ADD CONSTRAINT _articles_v_rels_tags_fk FOREIGN KEY (tags_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: _articles_v _articles_v_version_author_id_authors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v
    ADD CONSTRAINT _articles_v_version_author_id_authors_id_fk FOREIGN KEY (version_author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: _articles_v _articles_v_version_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v
    ADD CONSTRAINT _articles_v_version_category_id_categories_id_fk FOREIGN KEY (version_category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: _articles_v _articles_v_version_featured_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v
    ADD CONSTRAINT _articles_v_version_featured_image_id_media_id_fk FOREIGN KEY (version_featured_image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: _articles_v_version_key_takeaways _articles_v_version_key_takeaways_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_key_takeaways
    ADD CONSTRAINT _articles_v_version_key_takeaways_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._articles_v(id) ON DELETE CASCADE;


--
-- Name: _articles_v_version_photo_story _articles_v_version_photo_story_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_photo_story
    ADD CONSTRAINT _articles_v_version_photo_story_image_id_media_id_fk FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: _articles_v_version_photo_story _articles_v_version_photo_story_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_photo_story
    ADD CONSTRAINT _articles_v_version_photo_story_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._articles_v(id) ON DELETE CASCADE;


--
-- Name: _articles_v _articles_v_version_subcategory_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v
    ADD CONSTRAINT _articles_v_version_subcategory_id_categories_id_fk FOREIGN KEY (version_subcategory_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: _articles_v_version_timeline_milestones _articles_v_version_timeline_milestones_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v_version_timeline_milestones
    ADD CONSTRAINT _articles_v_version_timeline_milestones_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._articles_v(id) ON DELETE CASCADE;


--
-- Name: _articles_v _articles_v_version_university_id_institutions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._articles_v
    ADD CONSTRAINT _articles_v_version_university_id_institutions_id_fk FOREIGN KEY (version_university_id) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- Name: articles articles_author_id_authors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_author_id_authors_id_fk FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: articles articles_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: articles articles_featured_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_featured_image_id_media_id_fk FOREIGN KEY (featured_image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: articles_key_takeaways articles_key_takeaways_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_key_takeaways
    ADD CONSTRAINT articles_key_takeaways_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: articles_photo_story articles_photo_story_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_photo_story
    ADD CONSTRAINT articles_photo_story_image_id_media_id_fk FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: articles_photo_story articles_photo_story_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_photo_story
    ADD CONSTRAINT articles_photo_story_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: articles_rels articles_rels_districts_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_rels
    ADD CONSTRAINT articles_rels_districts_fk FOREIGN KEY (districts_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: articles_rels articles_rels_levels_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_rels
    ADD CONSTRAINT articles_rels_levels_fk FOREIGN KEY (levels_id) REFERENCES public.levels(id) ON DELETE CASCADE;


--
-- Name: articles_rels articles_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_rels
    ADD CONSTRAINT articles_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: articles_rels articles_rels_tags_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_rels
    ADD CONSTRAINT articles_rels_tags_fk FOREIGN KEY (tags_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: articles articles_subcategory_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_subcategory_id_categories_id_fk FOREIGN KEY (subcategory_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: articles_timeline_milestones articles_timeline_milestones_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles_timeline_milestones
    ADD CONSTRAINT articles_timeline_milestones_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: articles articles_university_id_institutions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_university_id_institutions_id_fk FOREIGN KEY (university_id) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict IoUIDbKZqpamfmXM14NG6UsjsKzad9Yynjn2N8HdINFfPfqQiRpmvcZo3gkEDFl

