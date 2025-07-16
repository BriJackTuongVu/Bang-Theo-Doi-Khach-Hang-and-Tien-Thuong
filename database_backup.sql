--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: customer_reports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customer_reports (
    id integer NOT NULL,
    customer_name text NOT NULL,
    report_sent boolean DEFAULT false NOT NULL,
    report_received_date date,
    customer_date date NOT NULL,
    tracking_record_id integer,
    created_at timestamp without time zone DEFAULT now(),
    customer_email text,
    customer_phone text,
    appointment_time text
);


ALTER TABLE public.customer_reports OWNER TO neondb_owner;

--
-- Name: customer_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.customer_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_reports_id_seq OWNER TO neondb_owner;

--
-- Name: customer_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.customer_reports_id_seq OWNED BY public.customer_reports.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO neondb_owner;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO neondb_owner;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: stripe_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.stripe_payments (
    id integer NOT NULL,
    stripe_payment_intent_id text NOT NULL,
    customer_email text,
    customer_name text,
    amount integer NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    is_first_time_payment boolean DEFAULT true NOT NULL,
    tracking_record_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stripe_payments OWNER TO neondb_owner;

--
-- Name: stripe_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.stripe_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stripe_payments_id_seq OWNER TO neondb_owner;

--
-- Name: stripe_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.stripe_payments_id_seq OWNED BY public.stripe_payments.id;


--
-- Name: tracking_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tracking_records (
    id integer NOT NULL,
    date date NOT NULL,
    scheduled_customers integer DEFAULT 0 NOT NULL,
    reported_customers integer DEFAULT 0 NOT NULL,
    closed_customers integer DEFAULT 0 NOT NULL,
    payment_status text DEFAULT 'chưa pay'::text NOT NULL
);


ALTER TABLE public.tracking_records OWNER TO neondb_owner;

--
-- Name: tracking_records_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.tracking_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tracking_records_id_seq OWNER TO neondb_owner;

--
-- Name: tracking_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.tracking_records_id_seq OWNED BY public.tracking_records.id;


--
-- Name: customer_reports id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_reports ALTER COLUMN id SET DEFAULT nextval('public.customer_reports_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: stripe_payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stripe_payments ALTER COLUMN id SET DEFAULT nextval('public.stripe_payments_id_seq'::regclass);


--
-- Name: tracking_records id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tracking_records ALTER COLUMN id SET DEFAULT nextval('public.tracking_records_id_seq'::regclass);


--
-- Data for Name: customer_reports; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_reports (id, customer_name, report_sent, report_received_date, customer_date, tracking_record_id, created_at, customer_email, customer_phone, appointment_time) FROM stdin;
231	Tran Khoa	f	\N	2025-06-30	147	2025-06-30 13:44:58.514549	jamestran.hotels@gmail.com	+1 678-234-5638	9:40 AM
233	Kevin Nguyen	f	\N	2025-06-30	147	2025-06-30 13:44:59.327848	kevincbcb@yahoo.com	+1 754-224-8328	10:30 AM
234	Son nguyen	f	\N	2025-06-30	147	2025-06-30 13:44:59.731128	thaitieuus@yahoo.com	+1 714-548-2958	11:00 AM
235	Thuy  Tran	f	\N	2025-06-30	147	2025-06-30 13:45:00.119561	tt.la.bella@gmail.com	+1 408-857-8034	11:40 AM
236	Thuy	f	\N	2025-06-30	147	2025-06-30 13:45:00.478771	theresale2010@yahoo.com	+1 714-675-9336	12:00 PM
237	Noel	f	\N	2025-06-30	147	2025-06-30 13:45:00.827219	noel_nguyen88@yahoo.com	+1 319-777-8453	12:40 PM
238	Brandy chung	f	\N	2025-06-30	147	2025-06-30 13:45:01.166408	minhbrandy@yahoo.com	+1 503-432-3312	1:30 PM
224	Brandy	f	\N	2025-06-27	144	2025-06-27 14:45:00.75254	minhbrandy@yahoo.com	+1 503-432-3312	12:20 PM
250	Leyen	t	\N	2025-07-02	149	2025-07-02 10:00:14.494761	ledsc94112@gmail.com	+1 415-624-6901	2:00 PM
227	Luyen 	f	\N	2025-06-27	144	2025-06-27 14:45:01.946001	seattlebestclean@hotmail.com	+1 206-234-4399	1:20 PM
248	Nguyen Kenny	t	\N	2025-07-02	149	2025-07-02 10:00:13.094551	therock190268@gmail.com	+1 760-858-6868	10:00 AM
229	Jimmy le	f	\N	2025-06-27	144	2025-06-27 14:45:02.749379	lej58668@gmail.com	+1 717-858-6293	2:30 PM
232	Tony  Phan 	t	2025-06-30	2025-06-30	147	2025-06-30 13:44:58.988524	tntauto76301@yahoo.com	+1 940-337-1629	10:00 AM
196	thai nha vo	t	\N	2025-06-25	24	2025-06-26 04:04:09.231273	nhabella78@gmail.com	+1 714-588-0133	\N
221	Thang	t	2025-06-30	2025-06-27	144	2025-06-27 14:44:59.537874	thanglun1214@icloud.com	+1 703-944-0319	10:40 AM
193	My tran	t	2025-06-25	2025-06-25	24	2025-06-26 04:04:08.984191	vanmy_1967@yahoo.com	+1 254-652-1418	\N
192	Kelly Tran	t	2025-06-25	2025-06-25	24	2025-06-26 04:04:08.903428	kellytran1231@gmail.com	+1 909-342-2423	\N
216	Duc Nguyen	f	\N	2025-06-26	28	2025-06-26 14:06:57.051767	duc.nguyen.jean@gmail.com	+1 903-926-3839	\N
239	thuan Van Tran	f	\N	2025-07-01	148	2025-07-01 05:52:52.781202	thuantran198441@gmail.com	+1 229-291-4589	9:40 AM
194	Linh	t	2025-06-26	2025-06-25	24	2025-06-26 04:04:09.06473	linhd8830@gmail.com	+1 205-810-9138	\N
220	Kieuloan	f	\N	2025-06-27	144	2025-06-27 14:44:59.222791	kieuloan4192@yahoo.com	+1 404-425-0386	10:00 AM
197	Hương	t	2025-06-24	2025-06-24	25	2025-06-26 04:06:00.725647	huongle18112004@gmail.com	+1 301-635-8027	\N
191	KimPhuong Le	t	2025-06-27	2025-06-25	24	2025-06-26 04:04:08.822318	kimphuongle10@icloud.com	+1 214-434-4516	\N
189	Lien ngoc tu	f	\N	2025-06-25	24	2025-06-26 04:04:08.657948	lienngoc0707@gmail.com	+1 703-832-2069	\N
195	Thompson chan	f	\N	2025-06-25	24	2025-06-26 04:04:09.148262	thompsonchan@hotmail.com	+1 626-329-8662	\N
228	Wilson Truong 	t	\N	2025-06-27	144	2025-06-27 14:45:02.287456	truongwilson8@gmail.com	+1 206-327-5588	1:40 PM
240	Anyhony	f	\N	2025-07-01	148	2025-07-01 05:52:57.854654	khoaphamx@gmail.com	+1 862-812-8050	10:00 AM
201	Luu	t	2025-06-24	2025-06-24	25	2025-06-26 04:06:01.045044	mrluu.jn@gmail.com	+1 561-213-4994	\N
241	Trien Dinh	f	\N	2025-07-01	148	2025-07-01 05:52:59.256006	trienlinebaugh@gmail.com	+1 813-415-8176	10:30 AM
242	Quynh 	f	\N	2025-07-01	148	2025-07-01 05:53:01.25496	quynhngo1997@gmail.com	+1 469-857-9535	11:00 AM
190	Hanhnguyen	f	\N	2025-06-25	24	2025-06-26 04:04:08.740883	thuhanh_happy2004@yahoo.com	+1 719-569-9155	\N
219	Huong xuan nguyen 	f	\N	2025-06-26	28	2025-06-27 14:44:50.809118	hungv7094@gmail.com	+1 407-969-6274	\N
243	Tien Tran	f	\N	2025-07-01	148	2025-07-01 05:53:03.454438	vietboy78@hotmail.com	+1 817-789-1022	1:30 PM
244	Kevin	f	\N	2025-07-01	148	2025-07-01 05:53:05.755117	kvthenguyen@yahoo.com	+1 714-278-2766	2:00 PM
245	Tanya Huynh	f	\N	2025-07-01	148	2025-07-01 05:53:08.154504	tanyahuynh9@yahoo.com	+1 559-767-5239	4:00 PM
188	Tran Ngoc	t	2025-07-01	2025-06-25	24	2025-06-26 04:04:08.566418	kimngoc140323@gmail.com	+1 681-494-8236	\N
222	Trinh Tran	t	\N	2025-06-27	144	2025-06-27 14:44:59.880344	trinhlandscaping701@gmail.com	+1 305-846-0756	11:10 AM
225	Tony Nguyen	t	2025-06-28	2025-06-27	144	2025-06-27 14:45:01.126285	tonyn1984@outlook.com	+1 714-213-0331	12:40 PM
198	Phong Nguyen	f	\N	2025-06-24	25	2025-06-26 04:06:00.806372	phongnguyen521970@gmail.com	+1 469-688-7179	\N
199	Jackie pham	f	\N	2025-06-24	25	2025-06-26 04:06:00.889022	jpham1080@gmail.com	+1 919-745-7330	\N
200	Trinh le	f	\N	2025-06-24	25	2025-06-26 04:06:00.967419	trinhhle10@gmail.com	+1 773-895-7628	\N
202	Tu thi cam le	f	\N	2025-06-24	25	2025-06-26 04:06:01.124025	tulebang1978@icloud.com	+1 469-988-0768	\N
203	Thien Nguyen	f	\N	2025-06-24	25	2025-06-26 04:06:01.204892	thiennguyen8548@icloud.com	+1 717-224-8548	\N
204	Aitram Nguyen	f	\N	2025-06-24	25	2025-06-26 04:06:01.283589	huongusa36@yahoo.com	+1 603-703-9325	\N
223	Trung Nguyen	t	2025-06-28	2025-06-27	144	2025-06-27 14:45:00.404608	tn7305@yahoo.com	+1 301-502-8412	12:00 PM
249	Hoai ngo	f	\N	2025-07-02	149	2025-07-02 10:00:13.794697	francishoai@gmail.com	+1 404-538-2528	10:20 AM
247	Chi doan	t	\N	2025-07-02	149	2025-07-02 10:00:11.896372	chiminhdoan911@gmail.com	+1 701-721-6836	9:30 AM
246	Mai Tran	t	\N	2025-07-02	149	2025-07-02 10:00:11.400086	duongkevin1128@icloud.com	+1 302-409-5824	9:00 AM
252	Hoang trang	t	\N	2025-07-03	150	2025-07-03 10:00:14.511466	tranghtrong@gmail.com	+1 561-528-9169	10:00 AM
258	Eddie 	f	\N	2025-07-04	151	2025-07-04 10:00:11.625574	eddiehoang5141@gmail.com	+1 279-333-9191	2:00 PM
272	Duc Nguyen	f	\N	2025-07-10	156	2025-07-10 06:08:08.870669	duc.nguyen.jean@gmail.com	+1 903-926-3839	10:00 AM
260	Ann Nguyen	t	\N	2025-07-07	153	2025-07-07 10:00:03.433897	angelnail801@yahoo.com	+1 385-313-1331	10:15 AM
263	Jackie 	t	\N	2025-07-08	154	2025-07-08 10:00:13.98406	jackievu1679@gmail.com	+1 626-586-0348	10:00 AM
262	Hoang nguyen 	t	2025-07-07	2025-07-07	153	2025-07-07 10:00:04.673195	johnnynguyen0801@gmail.com	+1 903-944-8092	1:30 PM
261	Linh Nguyen	t	2025-07-07	2025-07-07	153	2025-07-07 10:00:03.869437	linhmynguyen71@gmail.com	+1 210-314-0628	12:00 PM
259	Tina	t	2025-07-07	2025-07-07	153	2025-07-07 10:00:02.860053	tinathu27@gmail.com	+1 727-877-6666	10:00 AM
269	Nickolas Duval	f	\N	2025-07-09	155	2025-07-09 09:34:57.538036	nickolasjduval@gmail.com	+1 774-777-0872	12:15 PM
270	Vibol tran	f	\N	2025-07-09	155	2025-07-09 09:34:58.937131	viboltran1963@yahoo.com	+1 720-473-3675	1:00 PM
273	anthony hoang	f	\N	2025-07-10	156	2025-07-10 06:08:10.870967	tinhdoi0927@gmail.com	+1 716-867-9818	11:30 AM
268	Tony ho	t	2025-07-09	2025-07-09	155	2025-07-09 09:34:55.351377	tonyho0318@yahoo.com	+1 323-404-1887	12:00 PM
271	Phu tran	t	2025-07-09	2025-07-09	155	2025-07-09 09:35:00.43715	hpt278@gmail.com	+1 856-689-7257	2:30 PM
274	Kiet Nguyen	f	\N	2025-07-10	156	2025-07-10 06:08:12.669756	kietsnguyen@yahoo.com	+1 279-257-4224	2:45 PM
276	Tuong Vu	f	\N	2025-07-11	157	2025-07-11 06:23:23.423214	vdt1191@gmail.com	+1 804-931-5718	12:00 PM
277	Tuong Vu	f	\N	2025-07-11	157	2025-07-11 06:23:25.121413	vdt1191@gmail.com	+1 804-931-5718	12:15 PM
279	Charlie Nguyen	f	\N	2025-07-11	157	2025-07-11 06:23:29.820408	laser91731@yahoo.com	+1 832-212-6389	2:45 PM
275	Loc	t	\N	2025-07-11	157	2025-07-11 06:23:21.521801	trangsiloc@yahoo.com	+1 713-474-6689	11:00 AM
205	Mimi Huynh	f	\N	2025-06-24	25	2025-06-26 04:06:01.364268	mimihuynh328@gmail.com	+1 408-770-7700	\N
206	Danny Do	f	\N	2025-06-24	25	2025-06-26 04:06:01.446522	dannydo80@yahoo.com	+1 925-594-0242	\N
207	Tina huynh	f	\N	2025-06-24	25	2025-06-26 04:06:01.524455	nguyentina69@yahoo.com	+1 678-848-8397	\N
208	James Smith	f	\N	2025-06-24	25	2025-06-26 04:06:01.604956	jamessmith122705@gmail.com	+1 214-718-1227	\N
209	David Thai	f	\N	2025-06-24	25	2025-06-26 04:06:01.694031	davidthai940@gmail.com	+1 210-935-7019	\N
210	Jeanie Hoang	f	\N	2025-06-24	25	2025-06-26 04:06:01.775938	denisethao90@gmail.com	+1 657-282-2105	\N
211	Thuy Pham	f	\N	2025-06-24	25	2025-06-26 04:06:01.857775	erdp2003@yahoo.com	+1 510-274-0276	\N
212	Thu Truong	f	\N	2025-06-24	25	2025-06-26 04:06:01.937342	truongthu292@yahoo.com	+1 408-667-2240	\N
217	Thao	f	\N	2025-06-26	28	2025-06-26 14:07:22.291677	thaonguyen.27@yahoo.com	+1 408-387-9477	\N
218	Danny	t	\N	2025-06-26	28	2025-06-26 14:07:28.101943	ndanny2512@gmail.com	+1 405-394-3813	\N
253	Hanh	f	\N	2025-07-03	150	2025-07-03 10:00:14.736663	hanhkimau69@jahoo.com	+1 619-414-0990	1:00 PM
256	Vab thi Jackson	t	\N	2025-07-03	150	2025-07-03 10:00:17.096278	vandoanjackson@gmail.com	+1 858-866-6618	2:00 PM
255	Chu,Thinh 	t	\N	2025-07-03	150	2025-07-03 10:00:16.694878	dalat990@gmail.com	+1 503-799-2784	1:45 PM
254	Maikhanh	t	2025-07-07	2025-07-03	150	2025-07-03 10:00:15.495079	maikhanhthivo21@gmail.com	+1 571-771-9975	1:30 PM
257	Ryan Phan	f	\N	2025-07-03	150	2025-07-03 10:00:17.896178	hong.phanxuan88@gmail.com	+1 210-848-5988	2:50 PM
264	Quan tran	f	\N	2025-07-08	154	2025-07-08 10:00:14.2242	qbtran12@gmail.com	+1 503-568-2360	11:15 AM
265	Kim phượng đặng	f	\N	2025-07-08	154	2025-07-08 10:00:14.461991	phnglove22@gmail.com	+1 219-308-1282	11:30 AM
267	Minh Van Tang	t	\N	2025-07-08	154	2025-07-08 10:00:15.752793	minhtang01688@gmail.com	+1 915-888-1465	12:15 PM
266	Minh	t	2025-07-08	2025-07-08	154	2025-07-08 10:00:15.359817	tcle3700@gmail.com	+1 541-678-0969	12:00 PM
278	Truong tan	t	\N	2025-07-11	157	2025-07-11 06:23:27.820795	tannhocnhoc89@gmail.com	+1 850-775-5838	12:45 PM
280	Tuong Vu	f	\N	2025-07-14	160	2025-07-14 10:00:09.890324	vdt1191@gmail.com	+1 804-931-5718	10:00 AM
281	Tuong Vu	f	\N	2025-07-14	160	2025-07-14 10:00:10.11785	vdt1191@gmail.com	+1 804-931-5718	11:15 AM
282	Tuong Vu	f	\N	2025-07-14	160	2025-07-14 10:00:11.598201	vdt1191@gmail.com	+1 804-931-5718	11:30 AM
283	Tuong Vu	f	\N	2025-07-14	160	2025-07-14 10:00:12.99815	vdt1191@gmail.com	+1 804-931-5718	11:45 AM
284	Tuong Vu	f	\N	2025-07-14	160	2025-07-14 10:00:14.198529	vdt1191@gmail.com	+1 804-931-5718	12:00 PM
285	Tuong Vu	f	\N	2025-07-14	160	2025-07-14 10:00:15.798325	vdt1191@gmail.com	+1 804-931-5718	12:15 PM
286	Tuong Vu	f	\N	2025-07-14	160	2025-07-14 10:00:16.798722	vdt1191@gmail.com	+1 804-931-5718	12:30 PM
287	pham lien	f	\N	2025-07-14	160	2025-07-14 10:00:17.598431	phamlien941@gmail.com	+1 804-821-8444	12:45 PM
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.settings (id, key, value, created_at, updated_at) FROM stdin;
2	calendly_token	eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzUwODkwNTE3LCJqdGkiOiI4MjdhMTQzNS0zMGVjLTQ2NjQtOWE0ZC1iZTFlNjEwM2QzNTgiLCJ1c2VyX3V1aWQiOiI1ZThjOGM2Ni03ZmUxLTQ3MjctYmEyZC0zMmM5YTU2ZWIxY2EifQ.IYL3Tft4Jn5DXBccMUeKkeOAXh76EWzh5UMjOHzEKytSJqc9rXn9ZbwpIuQuLkrJ7O_dgk2OgFdZa-rhG5f-WA	2025-06-26 00:40:40.15716	2025-06-26 00:40:40.15716
3	auto_delete_old_data	false	2025-06-26 00:45:30.309422	2025-06-26 00:45:30.309422
5	preserve_memory_forever	true	2025-06-26 01:06:20.463429	2025-06-26 01:06:20.463429
6	data_retention_policy	permanent	2025-06-26 01:06:20.502261	2025-06-26 01:06:20.502261
7	memory_saved_at	2025-06-26T01:06:20.363Z	2025-06-26 01:06:20.53985	2025-06-26 01:06:20.53985
8	data_retention	true	2025-06-26 04:26:35.990825	2025-06-26 04:26:35.990825
\.


--
-- Data for Name: stripe_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.stripe_payments (id, stripe_payment_intent_id, customer_email, customer_name, amount, currency, payment_date, is_first_time_payment, tracking_record_id, created_at) FROM stdin;
\.


--
-- Data for Name: tracking_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tracking_records (id, date, scheduled_customers, reported_customers, closed_customers, payment_status) FROM stdin;
145	2025-06-28	0	0	0	chưa pay
146	2025-06-29	0	0	0	chưa pay
144	2025-06-27	9	3	0	chưa pay
147	2025-06-30	8	1	1	chưa pay
24	2025-06-25	9	5	0	chưa pay
148	2025-07-01	7	0	1	đã pay
149	2025-07-02	5	0	1	đã pay
151	2025-07-04	1	0	0	chưa pay
152	2025-07-05	0	0	0	chưa pay
150	2025-07-03	6	1	0	chưa pay
153	2025-07-07	4	3	0	chưa pay
25	2025-06-24	16	2	3	chưa pay
154	2025-07-08	5	1	0	chưa pay
155	2025-07-09	4	2	2	đã pay
28	2025-06-26	4	0	1	chưa pay
156	2025-07-10	3	0	0	chưa pay
157	2025-07-11	5	0	0	chưa pay
158	2025-07-12	0	0	0	chưa pay
159	2025-07-13	0	0	0	chưa pay
160	2025-07-14	8	0	0	chưa pay
161	2025-07-15	0	0	0	chưa pay
162	2025-07-16	0	0	0	chưa pay
\.


--
-- Name: customer_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.customer_reports_id_seq', 287, true);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.settings_id_seq', 8, true);


--
-- Name: stripe_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.stripe_payments_id_seq', 1, false);


--
-- Name: tracking_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.tracking_records_id_seq', 162, true);


--
-- Name: customer_reports customer_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_reports
    ADD CONSTRAINT customer_reports_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_unique UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: stripe_payments stripe_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stripe_payments
    ADD CONSTRAINT stripe_payments_pkey PRIMARY KEY (id);


--
-- Name: stripe_payments stripe_payments_stripe_payment_intent_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stripe_payments
    ADD CONSTRAINT stripe_payments_stripe_payment_intent_id_unique UNIQUE (stripe_payment_intent_id);


--
-- Name: tracking_records tracking_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tracking_records
    ADD CONSTRAINT tracking_records_pkey PRIMARY KEY (id);


--
-- Name: customer_reports customer_reports_tracking_record_id_tracking_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_reports
    ADD CONSTRAINT customer_reports_tracking_record_id_tracking_records_id_fk FOREIGN KEY (tracking_record_id) REFERENCES public.tracking_records(id);


--
-- Name: stripe_payments stripe_payments_tracking_record_id_tracking_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.stripe_payments
    ADD CONSTRAINT stripe_payments_tracking_record_id_tracking_records_id_fk FOREIGN KEY (tracking_record_id) REFERENCES public.tracking_records(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

