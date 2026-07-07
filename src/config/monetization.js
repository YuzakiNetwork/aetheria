function env(name, fallback = "") {
	return String(process.env[name] || fallback).trim();
}

export const MONETIZATION_CONFIG = {
	supporterPrice: env("AETHERIA_SUPPORTER_PRICE", "Rp10.000/bulan"),
	aetherPassPrice: env("AETHERIA_PASS_PRICE", "Rp25.000/30 hari"),
	monthlyTarget: env("AETHERIA_OPERATING_TARGET", "Rp150.000/bulan"),
	currentSupport: env("AETHERIA_OPERATING_CURRENT", "Rp0"),
	paymentUrl: env("AETHERIA_PAYMENT_URL"),
	supportPageUrl: env(
		"AETHERIA_SUPPORT_URL",
		"https://aetheria-theta.vercel.app/support"
	),
	sponsorContact: env("AETHERIA_SPONSOR_CONTACT"),
	paymentText: env(
		"AETHERIA_PAYMENT_TEXT",
		"Hubungi owner untuk aktivasi manual."
	),
};
