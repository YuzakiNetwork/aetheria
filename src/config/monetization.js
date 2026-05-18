function env(name, fallback = "") {
	return String(process.env[name] || fallback).trim();
}

export const MONETIZATION_CONFIG = {
	supporterPrice: env("AETHERIA_SUPPORTER_PRICE", "Rp10.000/bulan"),
	aetherPassPrice: env("AETHERIA_PASS_PRICE", "Rp25.000/30 hari"),
	paymentText: env(
		"AETHERIA_PAYMENT_TEXT",
		"Hubungi owner untuk aktivasi manual."
	),
};
