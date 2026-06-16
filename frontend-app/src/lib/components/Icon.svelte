<script lang="ts" module>
	import {
		Home,
		BookMarked,
		BookOpen,
		BookOpenCheck,
		Trophy,
		Settings,
		Sprout,
		Flame,
		Puzzle,
		Blocks,
		ClipboardList,
		GraduationCap,
		Library,
		Stethoscope,
		Hospital,
		Siren,
		PartyPopper,
		Sparkles,
		Check,
		X,
		Award,
		Medal,
		Ambulance,
		Frown,
		Search,
		Lock,
		Bell,
		Cloud,
		Crown,
		Trash2,
		Hand,
		ArrowLeft,
		ArrowRight,
		ChevronDown,
		Dna,
		Layers,
		CalendarCheck,
		Lightbulb,
		RotateCcw,
		Sparkle,
		Plus,
		Star,
		LogOut
	} from 'lucide-svelte';

	export const ICONS = {
		home: Home,
		collection: BookMarked,
		book: BookOpen,
		bookCheck: BookOpenCheck,
		trophy: Trophy,
		settings: Settings,
		sprout: Sprout,
		flame: Flame,
		puzzle: Puzzle,
		blocks: Blocks,
		clipboard: ClipboardList,
		cap: GraduationCap,
		library: Library,
		stethoscope: Stethoscope,
		hospital: Hospital,
		siren: Siren,
		party: PartyPopper,
		sparkles: Sparkles,
		check: Check,
		x: X,
		award: Award,
		medal: Medal,
		ambulance: Ambulance,
		frown: Frown,
		search: Search,
		lock: Lock,
		bell: Bell,
		cloud: Cloud,
		crown: Crown,
		trash: Trash2,
		hand: Hand,
		back: ArrowLeft,
		arrowRight: ArrowRight,
		chevronDown: ChevronDown,
		dna: Dna,
		layers: Layers,
		calendarCheck: CalendarCheck,
		lightbulb: Lightbulb,
		rotateCcw: RotateCcw,
		sparkle: Sparkle,
		plus: Plus,
		star: Star,
		logOut: LogOut
	} as const;

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	let {
		name,
		size = 18,
		strokeWidth = 2,
		class: cls = ''
	}: { name: IconName; size?: number; strokeWidth?: number; class?: string } = $props();

	const Comp = $derived(ICONS[name]);
</script>

<Comp {size} {strokeWidth} class={cls} />
