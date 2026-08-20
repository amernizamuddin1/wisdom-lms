# Wisdom LMS UI Refinement: Remove Dark Borders and Align with the New Brand System

## Purpose

This document is an addendum to:

`Wisdom_LMS_UI_Brand_Guidelines.md`

It addresses a specific visual issue still visible in the current Wisdom LMS interface: heavy dark borders around panels, tables, filters, sidebars, headers, buttons, and containers.

The objective is to remove the old black or near-black outline treatment and replace it with the softer, cleaner, more premium visual language defined in the new Wisdom LMS brand system.

This is strictly a UI refinement.

Do not change any current functionality, workflows, business logic, routes, APIs, data, validation, authentication, permissions, payments, Razorpay behavior, table behavior, filters, downloads, or user journeys.

---

# 1. Core Problem

The current UI still uses strong dark borders around:

- Sidebar boundaries
- Header boundaries
- Filter panels
- Tables
- Table containers
- Input groups
- Buttons
- Receipt buttons
- Cards
- Section containers

These borders make the interface feel older, heavier, more rigid, and visually inconsistent with the new Wisdom LMS design direction.

The new interface should feel:

- Lighter
- Softer
- More modern
- More spacious
- More premium
- Less boxed-in
- More aligned with contemporary SaaS products

---

# 2. Global Border Rule

Do not use black, charcoal, or near-black borders for standard UI surfaces.

Avoid:

```css
border-color: #000000;
border-color: #111111;
border-color: #1A1A1A;
border-color: #222222;
border-color: currentColor;
```

Avoid Tailwind utilities such as:

```text
border-black
border-neutral-900
border-zinc-900
border-slate-900
border-gray-900
```

for ordinary interface containers.

Use the brand tokens instead.

---

# 3. Light Mode Border System

Use:

```text
Default border: #E2E4E9
Subtle border: #ECEEF2
Strong border: #D2D5DC
Focus border: #7C5CFC
```

Recommended default:

```css
border: 1px solid #E2E4E9;
```

For lower-emphasis surfaces:

```css
border: 1px solid #ECEEF2;
```

Do not use dark borders for cards, tables, panels, forms, or layout containers.

---

# 4. Dark Mode Border System

Use:

```text
Default border: #2C2F38
Subtle border: #252730
Strong border: #3A3D48
Focus border: #8068FF
```

Recommended default:

```css
border: 1px solid #2C2F38;
```

Avoid pure white or overly bright borders in dark mode.

---

# 5. Border Radius

Use the following consistently:

```text
Inputs: 8px
Buttons: 8px
Cards: 12px
Panels: 12px
Tables: 12px
Modals: 16px
Small tags: 5px
```

The current filters panel and orders table should use:

```text
Radius: 12px
Border: 1px solid subtle/default border
```

Do not use sharp black outlines.

---

# 6. Filters Panel

The filters panel currently appears boxed with a strong dark outline.

Replace this with:

## Light Mode

```text
Background: #FFFFFF
Border: 1px solid #E2E4E9
Radius: 12px
Shadow:
0 1px 2px rgba(20, 24, 35, 0.03),
0 4px 12px rgba(20, 24, 35, 0.04)
```

Recommended internal spacing:

```text
Padding: 16px
Gap between fields: 16px
Bottom gap before action button: 16px
```

The panel should feel like a soft card, not a hard-bordered box.

---

# 7. Orders Table Container

The orders table currently has a dark outer border.

Replace with:

## Light Mode

```text
Background: #FFFFFF
Border: 1px solid #E2E4E9
Radius: 12px
Overflow: hidden
```

Optional subtle shadow:

```css
box-shadow:
  0 1px 2px rgba(20, 24, 35, 0.03),
  0 4px 12px rgba(20, 24, 35, 0.035);
```

The table should not have:

```text
Black outer border
Dark row separators
Heavy vertical dividers
Dark inset outlines
```

---

# 8. Table Row Separators

Use only soft horizontal separators.

## Light Mode

```text
Row separator: #ECEEF2
```

## Dark Mode

```text
Row separator: #252730
```

Recommended:

```css
border-bottom: 1px solid var(--color-border-subtle);
```

Do not use vertical column borders unless absolutely necessary for clarity.

---

# 9. Table Header

Use a subtle differentiated surface.

## Light Mode

```text
Background: #FAFBFC
Text: #515563
Bottom border: #E2E4E9
```

Recommended typography:

```text
Font size: 12px to 13px
Font weight: 600
Line height: 18px
```

The header should not feel boxed or heavy.

---

# 10. Sidebar

The left sidebar currently has a dark vertical divider.

Replace it with:

## Light Mode

```text
Sidebar background: #FFFFFF
Right border: 1px solid #ECEEF2
```

## Dark Mode

```text
Sidebar background: #121318
Right border: 1px solid #252730
```

Do not use a black divider.

The active navigation item should use:

## Light Mode

```text
Background: #F1EEFF
Text: #5138C7
Icon: #6548E8
Border: none
```

## Dark Mode

```text
Background: #292244
Text: #B6A6FF
Icon: #A994FF
Border: none
```

---

# 11. Top Header

The top header currently has a strong dark bottom border.

Replace it with:

## Light Mode

```text
Background: #FFFFFF
Bottom border: 1px solid #ECEEF2
```

## Dark Mode

```text
Background: #121318
Bottom border: 1px solid #252730
```

Do not use black or near-black separators.

---

# 12. Inputs and Select Fields

Inputs should not use dark outlines.

## Light Mode

```text
Background: #FFFFFF
Border: 1px solid #DFE2E7
Text: #181A20
Placeholder: #9195A1
Radius: 8px
```

Hover:

```text
Border: #D2D5DC
```

Focus:

```text
Border: #7C5CFC
Focus ring: 0 0 0 3px rgba(124, 92, 252, 0.16)
```

## Dark Mode

```text
Background: #20222B
Border: 1px solid #343741
Text: #F4F5F7
Placeholder: #757A87
```

---

# 13. Secondary Buttons

Buttons such as `Download Receipt` should no longer use a dark outline.

## Light Mode

```text
Background: #FFFFFF
Text: #353842
Border: 1px solid #D8DBE2
Radius: 8px
```

Hover:

```text
Background: #F7F8FA
Border: #C8CBD3
```

## Dark Mode

```text
Background: #20222B
Text: #F4F5F7
Border: 1px solid #383B45
```

Hover:

```text
Background: #292C36
```

Do not use black borders unless the button is intentionally destructive or has a special semantic purpose.

---

# 14. Primary Buttons

Use:

## Light Mode

```text
Background: #6548E8
Text: #FFFFFF
Border: none
Hover: #583BCF
Pressed: #4930B3
```

## Dark Mode

```text
Background: #8068FF
Text: #FFFFFF
Border: none
Hover: #927FFF
Pressed: #6F56E8
```

The `Apply Filters` button should follow this treatment.

---

# 15. Status Badges

Keep status badges soft and border-light.

## Paid / Success

```text
Background: #EAF8F1
Text: #16845A
Border: none
```

Dark mode:

```text
Background: rgba(53, 201, 139, 0.12)
Text: #35C98B
```

## Pending

Light mode:

```text
Background: #F4F5F7
Text: #515563
Border: 1px solid #E2E4E9
```

Dark mode:

```text
Background: #20222B
Text: #B8BBC5
Border: 1px solid #343741
```

Avoid black outlines.

---

# 16. Cards and Panels

General rule:

```text
Use soft borders.
Use subtle shadows.
Use surface differentiation.
Avoid heavy outlines.
```

Recommended light-mode card:

```text
Background: #FFFFFF
Border: 1px solid #E2E4E9
Radius: 12px
```

Optional shadow:

```css
box-shadow:
  0 1px 2px rgba(20, 24, 35, 0.03),
  0 4px 12px rgba(20, 24, 35, 0.04);
```

---

# 17. Visual Hierarchy Rule

Do not create hierarchy through dark outlines.

Create hierarchy using:

- Background contrast
- Spacing
- Typography
- Subtle borders
- Soft shadows
- Brand accent color
- Section separation

The interface should never feel like every component is trapped inside a black box.

---

# 18. Specific Changes for the Current Orders Page

Apply these exact refinements:

1. Replace the dark sidebar divider with `#ECEEF2`.
2. Replace the dark header bottom border with `#ECEEF2`.
3. Replace the filter panel dark border with `#E2E4E9`.
4. Add `12px` radius to the filter panel.
5. Add a very subtle light-mode shadow to the filter panel.
6. Replace the table container dark border with `#E2E4E9`.
7. Keep `12px` radius on the table container.
8. Replace row separators with `#ECEEF2`.
9. Use a soft `#FAFBFC` table header background.
10. Remove dark borders from `Download Receipt` buttons.
11. Use a soft gray border `#D8DBE2` for secondary buttons.
12. Preserve the Wisdom Indigo primary action button.
13. Ensure all corresponding dark-mode values use the new dark brand tokens.
14. Do not change any table content, actions, filters, columns, receipts, payment data, or functionality.

---

# 19. Recommended Semantic Tokens

Use or map to existing project tokens where possible.

```css
--color-border-default: #E2E4E9;
--color-border-subtle: #ECEEF2;
--color-border-strong: #D2D5DC;

--color-surface-primary: #FFFFFF;
--color-surface-secondary: #F4F5F7;
--color-surface-tertiary: #ECEEF2;

--color-text-primary: #181A20;
--color-text-secondary: #515563;
--color-text-tertiary: #747986;

--color-brand-primary: #6548E8;
--color-brand-hover: #583BCF;
--color-brand-pressed: #4930B3;
```

Dark mode:

```css
--color-border-default: #2C2F38;
--color-border-subtle: #252730;
--color-border-strong: #3A3D48;

--color-surface-primary: #181A21;
--color-surface-secondary: #20222B;
--color-surface-tertiary: #292C36;

--color-text-primary: #F4F5F7;
--color-text-secondary: #B8BBC5;
--color-text-tertiary: #8D919D;

--color-brand-primary: #8068FF;
--color-brand-hover: #927FFF;
--color-brand-pressed: #6F56E8;
```

---

# 20. Claude Code Implementation Instruction

When applying this addendum:

1. Read `Wisdom_LMS_UI_Brand_Guidelines.md`.
2. Read this file as a supplemental refinement.
3. Treat the main brand guidelines as the primary source of truth.
4. Apply this file specifically to remove heavy dark borders and old outline treatments.
5. Prefer existing semantic design tokens rather than introducing duplicate styling systems.
6. Search the codebase for dark border utilities and hardcoded border values.
7. Replace only visual styling.
8. Preserve all existing functionality.
9. Verify both light mode and dark mode.
10. Pay special attention to admin tables, filter panels, sidebars, headers, forms, and secondary buttons.

---

# 21. Final Direction

The finished Wisdom LMS interface should feel closer to the new brand reference:

- Soft
- Clean
- Premium
- Spacious
- Modern
- Lightly layered
- Visually calm

The desired visual result is not borderless.

The correct approach is:

```text
Soft borders + subtle surfaces + restrained shadows + strong spacing
```

The wrong approach is:

```text
Black outlines + hard boxes + heavy separators + excessive visual rigidity
```

Preserve every feature. Change only the visual presentation.
