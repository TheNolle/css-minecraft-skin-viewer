import './minecraft.css'
import React from 'react'

type ViewerType = 'player' | 'cape' | 'player-cape' | 'face' | 'skull'
type ZoomLevel = '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | '7x' | '8x' | '9x' | '10x' | '11x' | '12x' | '13x' | '14x' | '15x' | '16x' | '17x' | '18x' | '19x' | '20x'
type Effect = 'spin' | 'wind' | 'walking'

interface OutlineOptions {
  color?: string
  thickness?: number
}

interface PartTransform {
  x?: number
  y?: number
  z?: number
  tx?: number
  ty?: number
  tz?: number
}

interface PoseOptions {
  corpse?: PartTransform
  head?: PartTransform
  body?: PartTransform
  leftArm?: PartTransform
  rightArm?: PartTransform
  leftLeg?: PartTransform
  rightLeg?: PartTransform
}

interface AnimationFrame {
  pose: PoseOptions
  duration: number
  interpolate?: boolean
  resetToOrigin?: boolean
}

type SkinAnimation = AnimationFrame[]

const ANIM_PARTS = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'corpse'] as const
type AnimPart = typeof ANIM_PARTS[number]

const SKIN_ANIMATION_PARTS: Record<AnimPart, string> = {
  head: '--mc-anim-head',
  body: '--mc-anim-body',
  leftArm: '--mc-anim-left-arm',
  rightArm: '--mc-anim-right-arm',
  leftLeg: '--mc-anim-left-leg',
  rightLeg: '--mc-anim-right-leg',
  corpse: '--mc-anim-corpse',
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpTransform(a: PartTransform, b: PartTransform, t: number): PartTransform {
  const keys: (keyof PartTransform)[] = ['x', 'y', 'z', 'tx', 'ty', 'tz']
  const result: PartTransform = {}
  for (const k of keys) {
    const av = a[k] ?? 0
    const bv = b[k] ?? 0
    const v = lerp(av, bv, t)
    if (v !== 0) result[k] = v
  }
  return result
}

function lerpPose(a: PoseOptions, b: PoseOptions, t: number): PoseOptions {
  const result: PoseOptions = {}
  const parts: (keyof PoseOptions)[] = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'corpse']
  for (const part of parts) {
    const pa = a[part]
    const pb = b[part]
    if (!pa && !pb) continue
    result[part] = lerpTransform(pa ?? {}, pb ?? {}, t)
  }
  return result
}

function normalizeAngleTo(from: number, to: number): number {
  const rawDelta = to - from
  const shortDelta = ((rawDelta % 360) + 540) % 360 - 180
  return to - shortDelta
}

function lerpTransformNormalized(a: PartTransform, b: PartTransform, t: number): PartTransform {
  const keys: (keyof PartTransform)[] = ['x', 'y', 'z', 'tx', 'ty', 'tz']
  const result: PartTransform = {}
  for (const k of keys) {
    const av = a[k] ?? 0
    const bv = b[k] ?? 0
    const isRotation = k === 'x' || k === 'y' || k === 'z'
    const normalizedA = isRotation ? normalizeAngleTo(av, bv) : av
    const v = lerp(normalizedA, bv, t)
    if (Math.round(v * 1000) !== 0) result[k] = v
  }
  return result
}

function lerpPoseNormalized(a: PoseOptions, b: PoseOptions, t: number): PoseOptions {
  const result: PoseOptions = {}
  const parts: (keyof PoseOptions)[] = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'corpse']
  for (const part of parts) {
    const pa = a[part]
    const pb = b[part]
    if (!pa && !pb) continue
    result[part] = lerpTransformNormalized(pa ?? {}, pb ?? {}, t)
  }
  return result
}

const INTERPOLATION_STEP_MS = 16
const ORIGIN_POSE: PoseOptions = {}

function expandFrames(animation: SkinAnimation, loop: boolean): SkinAnimation {
  if (animation.length === 0) return animation
  const expanded: SkinAnimation = []
  for (let i = 0; i < animation.length; i++) {
    const frame = animation[i]
    if (frame.resetToOrigin) {
      const steps = Math.max(2, Math.round(frame.duration / INTERPOLATION_STEP_MS))
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        expanded.push({ pose: lerpPoseNormalized(frame.pose, ORIGIN_POSE, t), duration: frame.duration / steps })
      }
      continue
    }
    if (!frame.interpolate) {
      expanded.push(frame)
      continue
    }
    const nextIndex = i + 1 < animation.length ? i + 1 : (loop ? 0 : i)
    const next = animation[nextIndex]
    const steps = Math.max(2, Math.round(frame.duration / INTERPOLATION_STEP_MS))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      expanded.push({ pose: lerpPose(frame.pose, next.pose, t), duration: frame.duration / steps })
    }
  }
  return expanded
}

function buildAnimationStyles(id: string, animation: SkinAnimation, loop: boolean): string {
  if (animation.length === 0) return ''
  const frames = expandFrames(animation, loop)
  const totalDuration = frames.reduce((acc, f) => acc + f.duration, 0)
  const keyframeBlocks: string[] = []
  const animationRefs: string[] = []
  const iterationCount = loop ? 'infinite' : '1'
  for (const part of ANIM_PARTS) {
    if (!frames.some(frame => frame.pose[part])) continue
    const skinPart = SKIN_ANIMATION_PARTS[part]
    const keyframeId = `${id}-${part.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`)}`
    let elapsed = 0
    const stops: string[] = []
    for (const frame of frames) {
      const percent = (elapsed / totalDuration * 100).toFixed(3)
      const transform = frame.pose[part] ? buildTransform(frame.pose[part]!) : 'none'
      stops.push(`${percent}% { ${skinPart}: ${transform}; }`)
      elapsed += frame.duration
    }
    const closureTransform = loop ? (frames[0].pose[part] ? buildTransform(frames[0].pose[part]!) : 'none') : (frames[frames.length - 1].pose[part] ? buildTransform(frames[frames.length - 1].pose[part]!) : 'none')
    stops.push(`100% { ${skinPart}: ${closureTransform}; }`)
    keyframeBlocks.push(`@keyframes ${keyframeId} {\n  ${stops.join('\n  ')}\n}`)
    animationRefs.push(`${keyframeId} ${totalDuration}ms steps(1, end) ${iterationCount} forwards`)
  }
  if (animationRefs.length === 0) return ''
  return [...keyframeBlocks, `#${id} { animation: ${animationRefs.join(', ')}; }`].join('\n')
}

export interface MinecraftSkinViewerProps {
  skinUrl?: string
  capeUrl?: string
  type?: ViewerType
  zoom?: ZoomLevel
  effects?: Effect[]
  legacy?: boolean
  legacyCape?: boolean
  slim?: boolean
  hideAccessories?: boolean
  outline?: OutlineOptions
  pose?: PoseOptions
  animation?: SkinAnimation
  loop?: boolean
  id?: string
  style?: React.CSSProperties
  className?: string
}

const ZOOM_SCALE: Record<ZoomLevel, number> = {
  '1x': 1 / 9, '2x': 2 / 9, '3x': 3 / 9, '4x': 4 / 9, '5x': 5 / 9,
  '6x': 6 / 9, '7x': 7 / 9, '8x': 8 / 9, '9x': 1,
  '10x': 10 / 9, '11x': 11 / 9, '12x': 12 / 9, '13x': 13 / 9,
  '14x': 14 / 9, '15x': 15 / 9, '16x': 16 / 9, '17x': 17 / 9,
  '18x': 18 / 9, '19x': 19 / 9, '20x': 20 / 9,
}

const FACE_ZOOM: Record<ZoomLevel, number> = {
  '1x': 1, '2x': 2, '3x': 3, '4x': 4, '5x': 5,
  '6x': 6, '7x': 7, '8x': 8, '9x': 9, '10x': 10,
  '11x': 11, '12x': 12, '13x': 13, '14x': 14, '15x': 15,
  '16x': 16, '17x': 17, '18x': 18, '19x': 19, '20x': 20,
}

function BodyPartFaces({ withAccessory = true }: { withAccessory?: boolean }) {
  return (
    <>
      <div className='top' />
      <div className='left' />
      <div className='front' />
      <div className='right' />
      <div className='back' />
      <div className='bottom' />
      {withAccessory && (
        <div className='accessory'>
          <div className='top' />
          <div className='left' />
          <div className='front' />
          <div className='right' />
          <div className='back' />
          <div className='bottom' />
        </div>
      )}
    </>
  )
}

function PlayerBody({ withCape = false, corpseTransform }: { withCape?: boolean, corpseTransform?: string }) {
  return (
    <div className='mc-corpse' style={corpseTransform ? { transform: corpseTransform, transformStyle: 'preserve-3d', transformOrigin: '50% 144px' } : { transformStyle: 'preserve-3d' }}>
      <div className='player'>
        <div className='head'><BodyPartFaces /></div>
        <div className='body'><BodyPartFaces /></div>
        <div className='left-arm'><BodyPartFaces /></div>
        <div className='right-arm'><BodyPartFaces /></div>
        <div className='left-leg'><BodyPartFaces /></div>
        <div className='right-leg'><BodyPartFaces /></div>
        {withCape && <CapeBody />}
      </div>
    </div>
  )
}

function SkullBody({ corpseTransform }: { corpseTransform?: string }) {
  return (
    <div className='mc-corpse' style={corpseTransform ? { transform: corpseTransform, transformStyle: 'preserve-3d', transformOrigin: '50% 36px' } : { transformStyle: 'preserve-3d' }}>
      <div className='player'>
        <div className='head'><BodyPartFaces /></div>
      </div>
    </div>
  )
}

function CapeBody() {
  return (
    <div className='cape'>
      <div className='top' />
      <div className='left' />
      <div className='front' />
      <div className='right' />
      <div className='back' />
      <div className='bottom' />
    </div>
  )
}

function buildOutlineFilter(outline: OutlineOptions): string {
  const thickness = outline.thickness ?? 1
  const color = outline.color ?? '#000000'
  return [
    `drop-shadow(${thickness}px 0 0 ${color})`,
    `drop-shadow(-${thickness}px 0 0 ${color})`,
    `drop-shadow(0 ${thickness}px 0 ${color})`,
    `drop-shadow(0 -${thickness}px 0 ${color})`,
  ].join(' ')
}

function buildFaceStyles(factor: number, skinUrl?: string): { wrapStyle: React.CSSProperties, faceStyle: React.CSSProperties, hatStyle: React.CSSProperties } {
  const size = 8 * factor
  const sheet = 64 * factor
  const wrapStyle: React.CSSProperties = { position: 'relative', width: size, height: size, display: 'inline-block', imageRendering: 'pixelated' }
  const faceStyle: React.CSSProperties = { position: 'absolute', inset: 0, backgroundImage: skinUrl ? `url('${skinUrl}')` : undefined, backgroundSize: `${sheet}px ${sheet}px`, backgroundRepeat: 'no-repeat', backgroundPosition: `-${8 * factor}px -${8 * factor}px` }
  const hatStyle: React.CSSProperties = { position: 'absolute', inset: 0, backgroundImage: skinUrl ? `url('${skinUrl}')` : undefined, backgroundSize: `${sheet}px ${sheet}px`, backgroundRepeat: 'no-repeat', backgroundPosition: `-${40 * factor}px -${8 * factor}px` }
  return { wrapStyle, faceStyle, hatStyle }
}

function buildTransform(transform: PartTransform): string {
  const parts: string[] = []
  if (transform.tx) parts.push(`translateX(${transform.tx}px)`)
  if (transform.ty) parts.push(`translateY(${transform.ty}px)`)
  if (transform.tz) parts.push(`translateZ(${transform.tz}px)`)
  if (transform.x) parts.push(`rotateX(${transform.x}deg)`)
  if (transform.y) parts.push(`rotateY(${transform.y}deg)`)
  if (transform.z) parts.push(`rotateZ(${transform.z}deg)`)
  return parts.join(' ')
}

function buildPoseStyles(id: string, pose: PoseOptions): string {
  const rules: string[] = []
  if (pose.head) {
    const transform = buildTransform(pose.head)
    rules.push(`#${id} .player>.head { transform-origin: bottom center !important; transform: ${transform} !important; }`)
  }
  if (pose.body) {
    const transform = buildTransform(pose.body)
    rules.push(`#${id} .player>.body { transform-origin: top center !important; transform: translateY(72px) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-11x .player>.body { transform: translateY(88px) ${transform} !important; }`)
  }
  if (pose.leftArm) {
    const transform = buildTransform(pose.leftArm)
    rules.push(`#${id} .player>.left-arm { transform-origin: top center !important; transform: translateY(72px) translateX(-36px) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-11x .player>.left-arm { transform: translateY(88px) translateX(-44px) ${transform} !important; }`)
  }
  if (pose.rightArm) {
    const transform = buildTransform(pose.rightArm)
    rules.push(`#${id} .player>.right-arm { transform-origin: top center !important; transform: translateY(72px) translateX(72px) scaleX(-1) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-11x .player>.right-arm { transform: translateY(88px) translateX(88px) scaleX(-1) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-9x:not(.legacy) .player>.right-arm { transform: translateY(72px) translateX(72px) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-11x:not(.legacy) .player>.right-arm { transform: translateY(88px) translateX(88px) ${transform} !important; }`)
  }
  if (pose.leftLeg) {
    const transform = buildTransform(pose.leftLeg)
    rules.push(`#${id} .player>.left-leg { transform-origin: top center !important; transform: translateY(180px) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-11x .player>.left-leg { transform: translateY(220px) ${transform} !important; }`)
  }
  if (pose.rightLeg) {
    const transform = buildTransform(pose.rightLeg)
    rules.push(`#${id} .player>.right-leg { transform-origin: top center !important; transform: translateY(180px) translateX(36px) scaleX(-1) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-11x .player>.right-leg { transform: translateY(220px) translateX(44px) scaleX(-1) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-9x:not(.legacy) .player>.right-leg { transform: translateY(180px) translateX(36px) ${transform} !important; }`)
    rules.push(`#${id} .mc-skin-viewer-11x:not(.legacy) .player>.right-leg { transform: translateY(220px) translateX(44px) ${transform} !important; }`)
  }
  return rules.join('\n')
}

function buildVarPoseStyles(id: string): string {
  return [
    `#${id} .player>.head { transform-origin: bottom center !important; transform: var(--mc-anim-head, none) !important; }`,
    `#${id} .player>.body { transform-origin: top center !important; transform: translateY(72px) var(--mc-anim-body, ) !important; }`,
    `#${id} .mc-skin-viewer-11x .player>.body { transform: translateY(88px) var(--mc-anim-body, ) !important; }`,
    `#${id} .player>.left-arm { transform-origin: top center !important; transform: translateY(72px) translateX(-36px) var(--mc-anim-left-arm, ) !important; }`,
    `#${id} .mc-skin-viewer-11x .player>.left-arm { transform: translateY(88px) translateX(-44px) var(--mc-anim-left-arm, ) !important; }`,
    `#${id} .player>.right-arm { transform-origin: top center !important; transform: translateY(72px) translateX(72px) scaleX(-1) var(--mc-anim-right-arm, ) !important; }`,
    `#${id} .mc-skin-viewer-11x .player>.right-arm { transform: translateY(88px) translateX(88px) scaleX(-1) var(--mc-anim-right-arm, ) !important; }`,
    `#${id} .mc-skin-viewer-9x:not(.legacy) .player>.right-arm { transform: translateY(72px) translateX(72px) var(--mc-anim-right-arm, ) !important; }`,
    `#${id} .mc-skin-viewer-11x:not(.legacy) .player>.right-arm { transform: translateY(88px) translateX(88px) var(--mc-anim-right-arm, ) !important; }`,
    `#${id} .player>.left-leg { transform-origin: top center !important; transform: translateY(180px) var(--mc-anim-left-leg, ) !important; }`,
    `#${id} .mc-skin-viewer-11x .player>.left-leg { transform: translateY(220px) var(--mc-anim-left-leg, ) !important; }`,
    `#${id} .player>.right-leg { transform-origin: top center !important; transform: translateY(180px) translateX(36px) scaleX(-1) var(--mc-anim-right-leg, ) !important; }`,
    `#${id} .mc-skin-viewer-11x .player>.right-leg { transform: translateY(220px) translateX(44px) scaleX(-1) var(--mc-anim-right-leg, ) !important; }`,
    `#${id} .mc-skin-viewer-9x:not(.legacy) .player>.right-leg { transform: translateY(180px) translateX(36px) var(--mc-anim-right-leg, ) !important; }`,
    `#${id} .mc-skin-viewer-11x:not(.legacy) .player>.right-leg { transform: translateY(220px) translateX(44px) var(--mc-anim-right-leg, ) !important; }`,
    `#${id} .mc-corpse { transform: var(--mc-anim-corpse, none) !important; transform-style: preserve-3d; transform-origin: 50% 144px; }`,
    `#${id}.mc-skin-viewer-skull .mc-corpse { transform-origin: 50% 36px; }`,
  ].join('\n')
}

export function MinecraftSkinViewer({
  skinUrl,
  capeUrl,
  type = 'player',
  zoom = '9x',
  effects = [],
  legacy = false,
  legacyCape = false,
  slim = false,
  hideAccessories = false,
  outline,
  pose,
  animation,
  loop = false,
  id = 'mc-skin-viewer',
  style,
  className
}: MinecraftSkinViewerProps): React.ReactElement | null {
  const activePose = animation ? undefined : pose
  const scale = ZOOM_SCALE[zoom]
  const needsScale = scale !== 1
  const outlineFilter = outline ? buildOutlineFilter(outline) : undefined
  const wrapStyle: React.CSSProperties | undefined = (needsScale || outlineFilter) ? { display: 'inline-block', transformOrigin: 'top center', ...(needsScale && { transform: `scale(${scale})` }), ...(outlineFilter && { filter: outlineFilter }) } : undefined
  const effectClasses = effects.filter(Boolean)
  const playerClasses = ['mc-skin-viewer-9x', ...effectClasses, legacy && 'legacy', legacyCape && 'legacy-cape', slim && 'slim', hideAccessories && 'hide-accessories', className].filter(Boolean).join(' ')
  const capeClasses = ['mc-cape-viewer-9x', ...effectClasses, legacy && 'legacy'].filter(Boolean).join(' ')

  const buildStyles = (): string => {
    const rules: string[] = []
    if (type === 'cape') {
      if (capeUrl) rules.push(`#${id} * { background-image: url('${capeUrl}') }`)
    } else {
      if (skinUrl) rules.push(`#${id} * { background-image: url('${skinUrl}') }`)
      if (capeUrl && type === 'player-cape') rules.push(`#${id} .cape { background-image: url('${capeUrl}') }`)
    }
    if (animation && animation.length > 0) {
      rules.push(buildAnimationStyles(id, animation, loop))
      rules.push(buildVarPoseStyles(id))
    } else if (activePose) {
      rules.push(buildPoseStyles(id, activePose))
    }
    return rules.join('\n')
  }
  const scopedStyles = buildStyles()

  const wrap = (element: React.ReactElement): React.ReactElement => wrapStyle ? <div style={wrapStyle}>{element}</div> : element

  if (type === 'face') {
    const factor = FACE_ZOOM[zoom]
    const { wrapStyle: faceWrap, faceStyle, hatStyle } = buildFaceStyles(factor, skinUrl)
    const combined: React.CSSProperties = { ...faceWrap, ...(outlineFilter && { filter: outlineFilter }), ...style }
    return (
      <div id={id} className={className} style={combined}>
        <div style={faceStyle} />
        {!hideAccessories && <div style={hatStyle} />}
      </div>
    )
  }

  if (type === 'cape') {
    return wrap(
      <div style={{ display: 'contents' }}>
        {scopedStyles && <style>{scopedStyles}</style>}
        <div id={id} className={capeClasses} style={style}>
          <div className='wrapper'>
            <div className='cape'>
              <div className='left' />
              <div className='front' />
              <div className='right' />
              <div className='back' />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'skull') {
    const headPixelSize = 72
    const skullStyle: React.CSSProperties = { height: `${headPixelSize}px`, perspectiveOrigin: `50% ${headPixelSize / 2}px`, ...style }
    const corpseTransform = activePose?.corpse ? buildTransform(activePose.corpse) : undefined
    return wrap(
      <div style={{ display: 'contents' }}>
        {scopedStyles && <style>{scopedStyles}</style>}
        <div id={id} className={playerClasses} style={skullStyle}>
          <SkullBody corpseTransform={corpseTransform} />
        </div>
      </div>
    )
  }

  const corpseTransform = (!animation && activePose?.corpse) ? buildTransform(activePose.corpse) : undefined
  return wrap(
    <div style={{ display: 'contents' }}>
      {scopedStyles && <style>{scopedStyles}</style>}
      <div id={id} className={playerClasses} style={style}>
        <PlayerBody withCape={type === 'player-cape'} corpseTransform={corpseTransform} />
      </div>
    </div>
  )
}

type PoseList = 'T_POSE' | 'IDLE' | 'WALKING' | 'RUNNING' | 'SNEAKING' | 'SITTING' | 'SLEEPING' | 'WAVE' | 'VICTORY' | 'LOOK_UP' | 'LOOK_DOWN' | 'ATTACK' | 'OFFER' | 'DEAD'

/**
 * Built-in poses with predefined transformations for each body part.
 * @type {Record<PoseList, PoseOptions>}
 * @example
 * const idlePose: PoseOptions = POSES.IDLE
 * <MinecraftSkinViewer pose={idlePose} />
 * <MinecraftSkinViewer pose={{ ...idlePose, leftArm: { x: 45 } }} />
 * @remarks These poses are designed to mimic common Minecraft character stances and can be used as starting points for custom poses or animations.
 */
export const POSES: Record<PoseList, PoseOptions> = {
  T_POSE: { leftArm: { z: 90, tx: 17.5 }, rightArm: { z: 90, tx: 17.5 } },
  IDLE: { leftArm: { x: 5, z: 5 }, rightArm: { x: 5, z: 5 } },
  WALKING: { leftArm: { x: 30 }, rightArm: { x: -30 }, leftLeg: { x: -30 }, rightLeg: { x: 30 } },
  RUNNING: { body: { x: -10 }, leftArm: { x: 50 }, rightArm: { x: -50 }, leftLeg: { x: -40, tx: 0.01, ty: -5, tz: -15 }, rightLeg: { x: 40, tx: 0.01, ty: -5, tz: -15 } },
  SNEAKING: { body: { x: -25 }, head: { x: -20 }, leftArm: { x: -20, z: 5 }, rightArm: { x: -20, z: 5 }, leftLeg: { x: 15, tx: 0.01, ty: -20, tz: -45 }, rightLeg: { x: 15, tx: 0.01, ty: -20, tz: -45 } },
  SITTING: { leftLeg: { x: 90, tx: 0.01, tz: -26 }, rightLeg: { x: 90, tx: 0.01, tz: -26 }, body: { x: -5 } },
  SLEEPING: { corpse: { x: 90 } },
  WAVE: { leftArm: { x: 160, z: 10 } },
  VICTORY: { leftArm: { x: 150, z: 20 }, rightArm: { x: 150, z: 20 } },
  LOOK_UP: { head: { x: 25 } },
  LOOK_DOWN: { head: { x: -25 } },
  ATTACK: { head: { x: 5, y: -5 }, leftArm: { x: 80, y: -5, z: 5 }, rightArm: { x: -5, y: -5, z: 5 }, leftLeg: { x: -10, z: 5 }, rightLeg: { x: 10, z: 5 } },
  OFFER: { leftArm: { x: 60, z: -20 }, rightArm: { x: 60, z: -20 } },
  DEAD: { corpse: { x: 50, y: -10, z: 15 }, leftArm: { x: 0, y: -10, z: 25, tx: 5, ty: -2 }, rightArm: { x: 0, y: -10, z: 25, tx: 5, ty: -2 }, leftLeg: { x: 2, y: -5, z: 15, ty: 5 }, rightLeg: { x: 1, y: -6, z: 15, ty: 5 } },
}

type AnimationList = 'WALK' | 'RUN' | 'FRONT_FLIP' | 'BACK_FLIP'

/**
 * Built-in animations with predefined keyframes.
 * @type {Record<AnimationList, SkinAnimation>}
 * @example
 * const walkAnimation: SkinAnimation = ANIMATIONS.WALK
 * <MinecraftSkinViewer animation={walkAnimation} loop />
 * <MinecraftSkinViewer animation={[...walkAnimation, { pose: { leftArm: { x: 0 }, rightArm: { x: 0 }, leftLeg: { x: 0 }, rightLeg: { x: 0 } }, duration: 1000, resetToOrigin: true }]} />
 * @remarks The `resetToOrigin` flag in a keyframe will create an interpolated transition back to the default pose, allowing for smooth looping or ending of animations.
 */
export const ANIMATIONS: Record<AnimationList, SkinAnimation> = {
  WALK: [
    { pose: { leftArm: { x: 35 }, rightArm: { x: -35 }, leftLeg: { x: -35 }, rightLeg: { x: 35 } }, duration: 80, interpolate: true },
    { pose: { leftArm: { x: 20 }, rightArm: { x: -20 }, leftLeg: { x: -20 }, rightLeg: { x: 20 } }, duration: 80, interpolate: true },
    { pose: { leftArm: { x: 0 }, rightArm: { x: 0 }, leftLeg: { x: 0 }, rightLeg: { x: 0 } }, duration: 80, interpolate: true },
    { pose: { leftArm: { x: -20 }, rightArm: { x: 20 }, leftLeg: { x: 20 }, rightLeg: { x: -20 } }, duration: 80, interpolate: true },
    { pose: { leftArm: { x: -35 }, rightArm: { x: 35 }, leftLeg: { x: 35 }, rightLeg: { x: -35 } }, duration: 80, interpolate: true },
    { pose: { leftArm: { x: -20 }, rightArm: { x: 20 }, leftLeg: { x: 20 }, rightLeg: { x: -20 } }, duration: 80, interpolate: true },
    { pose: { leftArm: { x: 0 }, rightArm: { x: 0 }, leftLeg: { x: 0 }, rightLeg: { x: 0 } }, duration: 80, interpolate: true },
    { pose: { leftArm: { x: 20 }, rightArm: { x: -20 }, leftLeg: { x: -20 }, rightLeg: { x: 20 } }, duration: 80, interpolate: true },
  ],
  RUN: [
    { pose: { body: { x: -12 }, leftArm: { x: 55 }, rightArm: { x: -55 }, leftLeg: { x: -50, tz: -25 }, rightLeg: { x: 50, tz: -25 } }, duration: 75, interpolate: true },
    { pose: { body: { x: -12 }, leftArm: { x: 25 }, rightArm: { x: -25 }, leftLeg: { x: -25, tz: -25 }, rightLeg: { x: 25, tz: -25 } }, duration: 75, interpolate: true },
    { pose: { body: { x: -12 }, leftArm: { x: 0 }, rightArm: { x: 0 }, leftLeg: { x: 0, tz: -25 }, rightLeg: { x: 0, tz: -25 } }, duration: 75, interpolate: true },
    { pose: { body: { x: -12 }, leftArm: { x: -55 }, rightArm: { x: 55 }, leftLeg: { x: 50, tz: -25 }, rightLeg: { x: -50, tz: -25 } }, duration: 75, interpolate: true },
    { pose: { body: { x: -12 }, leftArm: { x: -25 }, rightArm: { x: 25 }, leftLeg: { x: 25, tz: -25 }, rightLeg: { x: -25, tz: -25 } }, duration: 75, interpolate: true },
    { pose: { body: { x: -12 }, leftArm: { x: 0 }, rightArm: { x: 0 }, leftLeg: { x: 0, tz: -25 }, rightLeg: { x: 0, tz: -25 } }, duration: 75, interpolate: true },
  ],
  FRONT_FLIP: [
    { pose: { corpse: { x: 15 }, leftArm: { x: -40, z: 5 }, rightArm: { x: -40, z: 5 }, leftLeg: { x: 10 }, rightLeg: { x: 10 } }, duration: 120, interpolate: true },
    { pose: { corpse: { x: -60 }, leftArm: { x: 170, z: 5 }, rightArm: { x: 170, z: 5 }, leftLeg: { x: -30 }, rightLeg: { x: -30 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: -130 }, leftArm: { x: 150, z: 10 }, rightArm: { x: 150, z: 10 }, leftLeg: { x: -60 }, rightLeg: { x: -60 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: -200 }, leftArm: { x: 130, z: 10 }, rightArm: { x: 130, z: 10 }, leftLeg: { x: -55 }, rightLeg: { x: -55 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: -270 }, leftArm: { x: 80, z: 8 }, rightArm: { x: 80, z: 8 }, leftLeg: { x: -30 }, rightLeg: { x: -30 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: -330 }, leftArm: { x: 20, z: 5 }, rightArm: { x: 20, z: 5 }, leftLeg: { x: -10 }, rightLeg: { x: -10 } }, duration: 180, resetToOrigin: true },
    { pose: { corpse: { x: 0 }, leftArm: { x: 10, z: 5 }, rightArm: { x: 10, z: 5 }, leftLeg: { x: 5 }, rightLeg: { x: 5 } }, duration: 400, interpolate: true },
  ],
  BACK_FLIP: [
    { pose: { corpse: { x: -15 }, leftArm: { x: -40, z: 5 }, rightArm: { x: -40, z: 5 }, leftLeg: { x: 10 }, rightLeg: { x: 10 } }, duration: 120, interpolate: true },
    { pose: { corpse: { x: 60 }, leftArm: { x: 170, z: 5 }, rightArm: { x: 170, z: 5 }, leftLeg: { x: -30 }, rightLeg: { x: -30 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: 130 }, leftArm: { x: 150, z: 10 }, rightArm: { x: 150, z: 10 }, leftLeg: { x: -60 }, rightLeg: { x: -60 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: 200 }, leftArm: { x: 130, z: 10 }, rightArm: { x: 130, z: 10 }, leftLeg: { x: -55 }, rightLeg: { x: -55 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: 270 }, leftArm: { x: 80, z: 8 }, rightArm: { x: 80, z: 8 }, leftLeg: { x: -30 }, rightLeg: { x: -30 } }, duration: 100, interpolate: true },
    { pose: { corpse: { x: 330 }, leftArm: { x: 20, z: 5 }, rightArm: { x: 20, z: 5 }, leftLeg: { x: -10 }, rightLeg: { x: -10 } }, duration: 180, resetToOrigin: true },
    { pose: { corpse: { x: 0 }, leftArm: { x: 10, z: 5 }, rightArm: { x: 10, z: 5 }, leftLeg: { x: 5 }, rightLeg: { x: 5 } }, duration: 400, interpolate: true },
  ],
}