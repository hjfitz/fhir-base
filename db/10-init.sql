CREATE TYPE patient_gender AS ENUM ('male', 'female', 'other');
CREATE TYPE account_type AS ENUM ('google', 'normal');

CREATE TABLE contact (
	contact_id 	serial 	PRIMARY KEY,
	prefix 		text 	NOT NULL,
	fullname 	text 	NOT NULL,
	given 		text 	NOT NULL,
	phone 		text 	NOT NULL,
	family 		text
);

CREATE TABLE patient (
	patient_id 		serial 			PRIMARY KEY,
	active 			boolean 		NOT NULL,
	fullname 		text 			NOT NULL,
	given 			text 			NOT NULL,
	prefix 			text 			NOT NULL,
	gender 			patient_gender 	NOT NULL,
	last_updated 	timestamptz 	NOT NULL,
	photo_url 		text,
	family 			text,
	contact_id 		serial REFERENCES contact(contact_id) ON DELETE CASCADE
);

CREATE TABLE observation (
	observation_id 	serial 		PRIMARY KEY,
	last_updated 	timestamptz NOT NULL,
	name 			text 	 	NOT NULL,
	value 			text 	 	NOT NULL
);

CREATE TABLE diagnostic_report (
	report_id 				serial 		PRIMARY KEY,
	last_updated 			timestamptz NOT NULL,
	patient_id 				serial 		REFERENCES patient(patient_id) 			ON DELETE CASCADE,
	respiratory_rate 		serial 		REFERENCES observation(observation_id)	ON DELETE CASCADE,
	oxygen_saturation 		serial 		REFERENCES observation(observation_id)	ON DELETE CASCADE,
	supplemental_oxygen 	serial 		REFERENCES observation(observation_id)	ON DELETE CASCADE,
	body_temperature 		serial	 	REFERENCES observation(observation_id)	ON DELETE CASCADE,
	systolic_bp 			serial 		REFERENCES observation(observation_id)	ON DELETE CASCADE,
	heart_rate 				serial 		REFERENCES observation(observation_id)	ON DELETE CASCADE,
	level_of_consciousness 	serial 		REFERENCES observation(observation_id)	ON DELETE CASCADE
);

CREATE TABLE location (
	location_id 	serial 		PRIMARY KEY,
	name		 	text 		UNIQUE NOT NULL,
	last_updated 	timestamptz NOT NULL,
	status		 	text 		NOT NULL,
	description 	text 		NOT NULL,
	type		 	text 		NOT NULL
);

CREATE TABLE practitioner (
	practitioner_id 	serial 		 PRIMARY KEY,
	name 	 			text 		 NOT NULL,
	added 				timestamptz  NOT NULL,
	username 		 	text 		 UNIQUE NOT NULL,
	account_type 		account_type NOT NULL,
	permissions 		json NOT NULL,
	passhash 			text
);

CREATE TABLE practitionerpatients (
	practitioner_id serial REFERENCES practitioner(practitioner_id),
	patient_id 	serial REFERENCES patient(patient_id),
	PRIMARY KEY(practitioner_id, patient_id)
);

CREATE TABLE encounter (
	encounter_id 	serial 		PRIMARY KEY,
	last_updated 	timestamptz NOT NULL,
	class 			text 		NOT NULL,
	status 			text 		NOT NULL,
	patient_id 		serial 		REFERENCES patient(patient_id) ON DELETE CASCADE,
	location_id 	serial 		REFERENCES location(location_id)
);

-- todo: find out units for dose and frequency
CREATE TABLE medication_usage (
	medication_usage_id serial PRIMARY KEY,
	medication_name text NOT NULL,
	medication_dose text NOT NULL,
	medication_frequency text NOT NULL
);

CREATE TABLE patient_history (
	history_id serial PRIMARY KEY,
	-- health history information
	childhood_illnesses json,
	immunisations json,
	-- could have used a mtm table here, but data is read and write, and not necessarily searchable
	-- data is unstructured here - just multiple string entries. should expect an array
	medical_issues json,
	surgical_operations json,
	other_hospitalisations json,
	-- medication info
	-- prescription medication, otc meds both mtm
	allergies json,
	-- exercise
	exercise_frequency text,
	-- diet info
	dieting boolean,
	difficulties_eating boolean,
	meals_daily int,
	-- alcohol questions
	drinks_alcohol boolean,
	alcohol_type text,
	alcoholic_drinks_weekly int,
	alcohol_concern boolean,
	alcohol_consider_stopping boolean,
	-- tobacco use
	tobacco_used_past_5_years boolean,
	tobacco_last_smoked timestamptz,
	tobacco_type text,
	currently_uses_tobacco boolean,
	currently_uses_tobacco_repalcement boolean,
	tobacco_replacement_type text,
	-- drug use
	uses_recreational_drugs boolean,
	-- type and frequency mtm
	used_recreational_with_needle boolean,
	-- other questions
	mental_health_history text,
	social_history text,
	family_history text,
	relevant_history text,

	-- sign off
	patient_id serial REFERENCES patient(patient_id),
	practitioner_id serial REFERENCES practitioner(practitioner_id),
	date timestamptz NOT NULL,
	practitioner_designation text NOT NULL,
	signature_blob text NOT NULL
);

-- intersection table for patient history and medication usage
CREATE TABLE history_prescription_medication_usage (
	medication_usage_id serial REFERENCES medication_usage(medication_usage_id),
	history_id serial REFERENCES patient_history(history_id),
	PRIMARY KEY (medication_usage_id, history_id)
);

-- intersection for otc usage
CREATE TABLE history_otc_medication_usage (
	medication_usage_id serial REFERENCES medication_usage(medication_usage_id),
	history_id serial REFERENCES patient_history(history_id),
	PRIMARY KEY (medication_usage_id, history_id)
);

-- intersection for drug usage
CREATE TABLE history_otc_drug_usage (
	medication_usage_id serial REFERENCES medication_usage(medication_usage_id),
	history_id serial REFERENCES patient_history(history_id),
	PRIMARY KEY (medication_usage_id, history_id)
);
