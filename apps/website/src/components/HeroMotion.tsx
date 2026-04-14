import { motion, useReducedMotion } from 'framer-motion';

export function HeroMotion() {
	const reduced = useReducedMotion();

	const container = {
		hidden: { opacity: 0, y: reduced ? 0 : 12 },
		show: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.09 },
		},
	};

	const item = {
		hidden: { opacity: 0, y: reduced ? 0 : 10 },
		show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] } },
	};

	return (
		<motion.section variants={container} initial="hidden" animate="show" className="hero-shell not-content">
			<motion.p variants={item} className="text-xs tracking-[0.16em] text-slate-300 uppercase m-0">
				Discord-first bot bridge
			</motion.p>
			<motion.h2 variants={item} className="text-3xl md:text-4xl font-semibold mt-3 mb-3">
				Ship reliable Discord automations without coupling app logic to gateway runtime.
			</motion.h2>
			<motion.p variants={item} className="m-0 text-slate-200/90 leading-7">
				Shardwire keeps your bot process and app process separate while exposing typed events, guarded
				actions, and strict capability checks over one secure websocket channel.
			</motion.p>
			<motion.div variants={item} className="metric-grid">
				<div className="metric-item">
					<p className="metric-label m-0">process model</p>
					<p className="metric-value m-0">Bot + App split</p>
				</div>
				<div className="metric-item">
					<p className="metric-label m-0">security</p>
					<p className="metric-value m-0">Scoped secrets</p>
				</div>
				<div className="metric-item">
					<p className="metric-label m-0">runtime checks</p>
					<p className="metric-value m-0">Strict startup</p>
				</div>
			</motion.div>
		</motion.section>
	);
}
