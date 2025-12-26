import nodemailer from 'nodemailer';

// Cache transporter across calls to avoid rebuilding on every email
let cachedTransporter = null;

const logPrefix = '[mail]';

const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

const hasAllEnv = () => requiredEnv.every((key) => Boolean(process.env[key]));

const buildTransporter = () => {
	if (!hasAllEnv()) {
		if (process.env.NODE_ENV === 'development') {
			console.warn(`${logPrefix} SMTP not fully configured; emails will be skipped.`);
		}
		return null;
	}

	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

	const secure = SMTP_SECURE === 'true' || SMTP_SECURE === true;
	const port = Number(SMTP_PORT);

	const transport = nodemailer.createTransport({
		host: SMTP_HOST.trim(),
		port: Number.isNaN(port) ? 587 : port,
		secure,
		auth: {
			user: SMTP_USER.trim(),
			pass: SMTP_PASS.trim(),
		},
		connectionTimeout: 10000,
		greetingTimeout: 10000,
		socketTimeout: 10000,
		debug: process.env.NODE_ENV === 'development',
		logger: process.env.NODE_ENV === 'development',
	});

	transport.verify((error) => {
		if (error) {
			console.error(`${logPrefix} SMTP verification failed:`, error.message);
		} else {
			console.log(`${logPrefix} SMTP transporter ready.`);
		}
	});

	return transport;
};

export const getTransporter = () => {
	if (cachedTransporter) {
		return cachedTransporter;
	}

	cachedTransporter = buildTransporter();
	return cachedTransporter;
};

const buildFromAddress = () => {
	if (process.env.MAIL_FROM) {
		return process.env.MAIL_FROM;
	}
	const fallback = process.env.SMTP_USER || 'no-reply@parking.example';
	return `"Parking Management" <${fallback}>`;
};

export const sendEmail = async ({ to, subject, html, text, from }) => {
	const transporter = getTransporter();

	if (!transporter) {
		return {
			success: false,
			error: 'SMTP not configured',
			messageId: null,
		};
	}

	if (!to) {
		return {
			success: false,
			error: 'Recipient email is required',
			messageId: null,
		};
	}

	try {
		const info = await transporter.sendMail({
			from: from || buildFromAddress(),
			to: to.trim(),
			subject,
			html,
			text,
		});

		return {
			success: true,
			error: null,
			messageId: info.messageId || null,
			response: info.response,
		};
	} catch (error) {
		console.error(`${logPrefix} Failed to send email to ${to}:`, error.message);
		return {
			success: false,
			error: error.message,
			messageId: null,
		};
	}
};

export default sendEmail;
