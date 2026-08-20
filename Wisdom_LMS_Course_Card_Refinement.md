# Wisdom LMS Course Card Layout and Hover Interaction Refinement

## Purpose

This document is a focused UI refinement instruction for the learner-facing course cards in Wisdom LMS.

It should be used together with:

- `Wisdom_LMS_UI_Brand_Guidelines.md`
- `Wisdom_LMS_Border_and_Surface_Refinement.md`

This update is strictly visual.

Do not change any current functionality, data, course access logic, progress logic, navigation, buttons, enrollment behavior, routes, APIs, or user journeys.

---

# 1. Current Problems to Fix

The current course cards have the following visual issues:

- The cards stretch too wide across the page.
- The card thumbnails are being cut off at the top.
- The cards lack sufficient visual separation from the page background.
- The cards do not feel interactive enough.
- The layout does not maintain a consistent card width.
- The hover state is too static.

The goal is to create a more premium, controlled, modern course-card layout.

---

# 2. Card Width and Grid Behavior

Do not allow course cards to stretch indefinitely to fill the entire available row.

Use a responsive grid with controlled card widths.

Recommended behavior:

```text
Desktop:
- 3 cards per row where space permits
- Preferred card width: 340px to 420px
- Maximum card width: 420px

Large desktop:
- Do not let cards become excessively wide
- Keep the grid left-aligned or centered within the content area
- Use consistent gaps between cards

Tablet:
- 2 cards per row

Mobile:
- 1 card per row
- Full width within the mobile content container
```

Recommended CSS logic:

```css
grid-template-columns: repeat(auto-fill, minmax(320px, 420px));
gap: 20px;
justify-content: start;
```

Equivalent Tailwind or framework-native classes may be used.

Do not force `1fr` columns that cause three cards to stretch across the entire viewport.

---

# 3. Card Dimensions

Recommended card structure:

```text
Card width: responsive, ideally 340px to 420px
Card min-height: auto
Card radius: 12px
Overflow: hidden
Background: surface-primary
Border: 1px solid soft brand border
```

The card height should be determined by content.

Do not force excessive fixed heights.

The important constraint is width, not a rigid fixed height.

---

# 4. Thumbnail Area

The thumbnail should always be fully visible within the card.

Use a fixed aspect ratio:

```text
Aspect ratio: 16:9
Width: 100%
Height: auto
Object fit: cover
```

Recommended:

```css
aspect-ratio: 16 / 9;
overflow: hidden;
```

Image:

```css
width: 100%;
height: 100%;
object-fit: cover;
display: block;
```

Do not use negative margins, top offsets, translate values, or absolute positioning that causes the image to be clipped.

Do not let the image start above the visible card boundary.

---

# 5. Prevent Top Clipping

Specifically inspect the course-card markup and surrounding layout for:

- Negative top margins
- `translate-y-*`
- Absolute positioning
- Parent overflow clipping
- Unexpected fixed heights
- Improper line-height or top padding
- Container transforms
- Misused `overflow-hidden`

The thumbnail must start cleanly at the top edge of the card.

There should be no clipping of the first row of pixels or image content.

---

# 6. Card Shadow

Every course card should have a soft, premium shadow.

## Light Mode

Recommended:

```css
box-shadow:
  0 2px 8px rgba(20, 24, 35, 0.05),
  0 8px 20px rgba(20, 24, 35, 0.06);
```

On hover:

```css
box-shadow:
  0 6px 18px rgba(20, 24, 35, 0.08),
  0 14px 30px rgba(20, 24, 35, 0.10);
```

## Dark Mode

Recommended:

```css
box-shadow:
  0 8px 24px rgba(0, 0, 0, 0.28);
```

On hover:

```css
box-shadow:
  0 12px 32px rgba(0, 0, 0, 0.36);
```

The shadow should remain soft and restrained.

Do not use a hard glow.

---

# 7. Hover Tilt Animation

Add a very subtle tilt interaction to each course card.

Recommended hover effect:

```text
Rotate X: approximately 0.5deg to 1deg
Rotate Y: approximately 0.5deg to 1deg
Translate Y: -2px to -4px
```

The effect should feel subtle and premium.

Do not use exaggerated 3D motion.

Recommended transform:

```css
transform:
  translateY(-3px)
  rotateX(0.7deg)
  rotateY(-0.7deg);
```

Use:

```css
transform-origin: center;
will-change: transform;
```

The direction may be kept consistent or made slightly responsive to pointer position if the current stack supports that cleanly.

Do not introduce heavy JavaScript for a tiny visual effect if CSS is sufficient.

---

# 8. Thumbnail Zoom on Hover

When the user hovers over the card:

- Keep the card itself slightly lifted and tilted.
- Zoom the thumbnail image in gently.

Recommended image scale:

```text
scale(1.03) to scale(1.05)
```

Preferred:

```css
transform: scale(1.04);
```

The image container must use:

```css
overflow: hidden;
```

Recommended transition:

```css
transition: transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1);
```

Do not zoom the entire card aggressively.

Only the image should receive the zoom effect.

---

# 9. Card Hover Transition

Recommended:

```css
transition:
  transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
  box-shadow 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
  border-color 180ms ease;
```

The hover should feel quick but smooth.

Avoid:

- Bouncy spring motion
- Excessive rotation
- Large scaling of the entire card
- Slow animations
- Distracting glow effects

---

# 10. Accessibility and Reduced Motion

Respect reduced-motion preferences.

Use:

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable or significantly reduce tilt and zoom motion */
}
```

At minimum:

- Remove tilt
- Remove lift
- Remove image zoom
- Keep instant or minimal visual state change

Do not make hover motion mandatory for usability.

---

# 11. Card Content Spacing

Recommended content padding:

```text
16px
```

Recommended spacing:

```text
Course title to progress text: 12px
Progress text to progress bar: 6px
Progress bar to action button: 14px
```

Avoid excessive empty vertical space.

Keep the card compact and balanced.

---

# 12. Progress Bar

Preserve existing course progress logic.

Only refine appearance.

Recommended:

```text
Track height: 6px
Track radius: 999px
Track background: surface-tertiary
Progress fill: Wisdom Indigo
```

Light mode:

```text
Track: #ECEEF2
Fill: #6548E8
```

Dark mode:

```text
Track: #292C36
Fill: #8068FF
```

Do not change progress values or calculation logic.

---

# 13. Button Styling

Preserve existing button actions and labels.

Recommended primary button:

## Light Mode

```text
Background: #6548E8
Text: #FFFFFF
Hover: #583BCF
Radius: 8px
```

## Dark Mode

```text
Background: #8068FF
Text: #FFFFFF
Hover: #927FFF
Radius: 8px
```

Do not alter navigation or course-start behavior.

---

# 14. Empty Thumbnail State

For courses without thumbnails:

Do not leave a flat generic gray block if it can be visually improved without changing functionality.

Recommended:

```text
Background: #F4F5F7
Text: #747986
Icon or label centered
Same 16:9 aspect ratio as regular thumbnails
```

Dark mode:

```text
Background: #20222B
Text: #8D919D
```

Keep the exact same image area dimensions as normal course thumbnails.

---

# 15. Recommended Final Card Style

The ideal card should feel like this:

```text
Soft white card
12px radius
Subtle neutral border
Soft layered shadow
Fixed responsive width
16:9 image
No clipping
Slight lift and tilt on hover
Thumbnail zoom to approximately 1.04
Smooth 200ms to 350ms motion
Compact content spacing
No exaggerated effects
```

---

# 16. Specific Implementation Instruction for Claude Code

Please do the following:

1. Inspect the learner course-card component and its parent grid container.
2. Identify why cards are stretching excessively.
3. Identify why thumbnail images are being clipped at the top.
4. Fix the card-grid sizing so cards remain within a controlled responsive width.
5. Ensure the thumbnail uses a proper 16:9 image container.
6. Remove any layout rule causing top clipping.
7. Add a soft shadow to every course card.
8. Add a subtle hover lift and tilt.
9. Add a slight image zoom on hover.
10. Ensure hover effects work in both light mode and dark mode.
11. Respect `prefers-reduced-motion`.
12. Preserve all course data, progress logic, routes, buttons, and functionality exactly as they currently work.

---

# 17. Scope Limitation

This is strictly a visual refinement.

Do not change:

- Course access logic
- Progress calculation
- Course navigation
- Course start or continue actions
- Enrollment logic
- User data
- APIs
- Database schema
- Authentication
- Authorization
- Routes
- Business logic
- Any existing feature behavior

Only update layout, styling, card dimensions, shadows, and hover motion.

---

# 18. Final Direction

The course cards should no longer look stretched or clipped.

They should feel:

- Structured
- Premium
- Interactive
- Compact
- Consistent
- Modern
- Visually aligned with the Wisdom LMS brand system

The target is subtle sophistication, not flashy motion.
