import { motion, useReducedMotion } from 'framer-motion';

const features = [
	{
		title: 'Capability negotiation',
		body: 'Intents and secret scope are reconciled at connect time so apps only subscribe to what they are allowed to consume.',
	},
	{
		title: 'ActionResult discipline',
		body: 'Every action returns a typed success or failure contract with stable error codes and optional retry metadata.',
	},
	{
		title: 'Diagnostics built in',
		body: 'Use catalog, preflight, explainCapability, and diagnoseShardwireApp before production incidents force guesswork.',
	},
	{
		title: 'Deployment hardening',
		body: 'Loopback-only ws, non-loopback wss, backpressure controls, and graceful shutdown sequencing are first-class.',
	},
];

export function FeatureGridMotion() {
	const reduced = useReducedMotion();

	return (
		<section className="not-content mt-8">
			<motion.div
				className="grid md:grid-cols-2 gap-4"
				initial={reduced ? false : { opacity: 0, y: 8 }}
				whileInView={reduced ? {} : { opacity: 1, y: 0 }}
				viewport={{ once: true, margin: '-40px' }}
				transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08 }}
			>
				{features.map((feature) => (
					<motion.article
						key={feature.title}
						className="feature-card"
						initial={reduced ? false : { opacity: 0, y: 8 }}
						whileInView={reduced ? {} : { opacity: 1, y: 0 }}
						viewport={{ once: true, margin: '-30px' }}
						transition={{ duration: 0.42, ease: [0.25, 1, 0.5, 1] }}
					>
						<h3>{feature.title}</h3>
						<p>{feature.body}</p>
					</motion.article>
				))}
			</motion.div>
		</section>
	);
}
