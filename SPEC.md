# Try Clothes - Virtual Try-On Application Specification

## 1. Project Overview

### Project Name
Try Clothes (虚拟试衣)

### Project Type
Web Application (Next.js)

### Core Functionality
A virtual try-on solution that allows users to upload their photos and clothing images, automatically detecting clothing categories and person types to generate realistic try-on results.

### Target Users
- Online shoppers who want to preview clothes before purchase
- Fashion enthusiasts exploring different outfits
- E-commerce platforms requiring try-on capabilities

---

## 2. UI/UX Specification

### 2.1 Layout Structure

#### Page Sections
1. **Header** - Fixed top navigation bar
   - Logo on left
   - App name "Try Clothes" center
   - Minimal, no additional nav items needed

2. **Main Content Area** - Centered container
   - Max width: 1200px
   - Padding: 24px horizontal
   - Vertical spacing depends on flow state

3. **Footer** - Minimal footer
   - Copyright text only
   - Height: 60px

#### Flow States
1. **Initial State** - Upload interface
2. **Processing State** - Generation in progress
3. **Results State** - Display all results
4. **Comparison State** - Side-by-side view

### 2.2 Visual Design

#### Color Palette
```
Primary: #1A1A2E (Deep Navy)
Secondary: #16213E (Dark Blue)
Accent: #E94560 (Coral Red)
Background: #0F0F1A (Near Black)
Surface: #1F1F2E (Dark Gray)
Surface Light: #2A2A3E (Lighter Gray)
Text Primary: #FFFFFF (White)
Text Secondary: #A0A0B0 (Muted Gray)
Success: #4ADE80 (Green)
Error: #F87171 (Red)
Warning: #FBBF24 (Amber)
```

#### Typography
```
Font Family: "Inter", system-ui, sans-serif
Heading H1: 36px, font-weight: 700
Heading H2: 28px, font-weight: 600
Heading H3: 20px, font-weight: 600
Body: 16px, font-weight: 400
Small: 14px, font-weight: 400
Caption: 12px, font-weight: 400
```

#### Spacing System
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

#### Border Radius
```
sm: 6px
md: 12px
lg: 16px
full: 9999px
```

#### Visual Effects
- Card shadows: 0 4px 24px rgba(0, 0, 0, 0.3)
- Hover transitions: 200ms ease
- Button hover: slight scale (1.02) and brightness increase
- Image hover: subtle border glow

### 2.3 Components

#### Upload Zone Component
- Dashed border (#2A2A3E)
- Border radius: 16px
- Height: 200px
- Icon: cloud upload (48px)
- Text: "Drag photos here or click to upload"
- Accepts: JPG, PNG
- Hover state: border color changes to accent

#### Photo Card Component
- Aspect ratio: maintains original
- Max height: 300px
- Border radius: 12px
- Overlay on hover: delete button
- Delete button: top-right corner, circular, red

#### Clothing Card Component
- Fixed aspect ratio: 1:1
- Size: 150px x 150px
- Border radius: 12px
- Selected state: accent border (2px)
- Hover: subtle lift effect

#### Generate Button
- Full width (when primary action)
- Height: 56px
- Background: accent (#E94560)
- Text: white, bold
- Border radius: 12px
- Disabled state: opacity 0.5

#### Result Card
- Full width in grid
- Aspect ratio: maintains original
- Border radius: 12px
- Click: opens comparison view

#### Progress Indicator
- Linear progress bar
- Accent color
- Shows current/total (e.g., "3/8")

---

## 3. Functionality Specification

### 3.1 Photo Upload Flow

#### Person Photos Upload
- **Input**: Multiple images (JPG, PNG)
- **Constraints**: No limit on number
- **Validation**: 
  - Must be valid image format
  - File size display (no limit)
- **UI Behavior**:
  - Show thumbnails grid
  - Each has delete capability
  - Image type badge (if detectable)

#### Clothing Image Upload
- **Input**: Single image (JPG, PNG)
- **Source Options**:
  1. User upload (primary path)
  2. Example clothing selection (secondary)
- **Validation**:
  - Show warning for complex backgrounds
- **UI Behavior**:
  - Large preview area
  - Category badge after detection

### 3.2 Image Analysis Module

#### Clothing Category Detection
- **Categories**:
  - `top` (上衣) - shirts, T-shirts, jackets, sweaters
  - `bottom` (下装) - pants, shorts
  - `skirt` (裙子)
- **Output**: Category label with confidence

#### Person Type Detection
- **Types**:
  - `full` (全身) - Complete body visible
  - `upper` (上半身) - Only torso and above
  - `invalid` (不可用) - Cannot process
- **Output**: Type label with confidence

### 3.3 Matching Validation (Strong Rules)

| Person Type | Clothing Category | Allowed |
|------------|------------------|---------|
| upper      | top              | ✅ Yes  |
| upper      | bottom           | ❌ No   |
| upper      | skirt            | ❌ No   |
| full       | top              | ✅ Yes  |
| full       | bottom           | ✅ Yes  |
| full       | skirt            | ✅ Yes  |
| invalid    | any              | ❌ No   |

**On Mismatch**:
- Show error message: "当前照片无法试穿该服装，请上传更完整的人物照片"
- Block generation
- Highlight mismatched photos

### 3.4 Generation Logic

#### Input
- 1 clothing image
- Multiple person photos (validated)

#### Output
- Multiple try-on images (one per person photo)

#### Process
- Sequential generation
- Stream results as completed
- Progress indicator shows status

### 3.5 Results Display

- Grid layout (responsive)
- All results shown (no filtering)
- Each card shows:
  - Try-on image
  - Subtle original reference (on hover optional)

### 3.6 Comparison View

- **Layout**: Side-by-side
  - Left: Original photo
  - Right: Try-on result
- ** Interactions**:
  - Close button returns to results
  - Optional: regenerate single

### 3.7 Re-generation

- Available per result card
- Shows loading state
- Replaces the specific result

---

## 4. Technical Architecture

### 4.1 Framework & Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui

### 4.2 Project Structure
```
/app
  /layout.tsx
  /page.tsx
  /globals.css
/components
  /ui (shadcn components)
  /PhotoUpload.tsx
  /ClothingUpload.tsx
  /PhotoCard.tsx
  /ClothingCard.tsx
  /GenerateButton.tsx
  /ResultCard.tsx
  /ComparisonView.tsx
  /ProgressBar.tsx
  /Header.tsx
  /Footer.tsx
/lib
  /types.ts
  /utils.ts
  /constants.ts
/hooks
  /useAnalysis.ts
  /useTryOn.ts
/public
  /images (example clothing)
```

### 4.3 Key Interfaces

```typescript
interface PersonPhoto {
  id: string;
  url: string;
  type: 'full' | 'upper' | 'invalid';
  preview?: string;
}

interface ClothingItem {
  id: string;
  url: string;
  category: 'top' | 'bottom' | 'skirt';
  isExample?: boolean;
}

interface TryOnResult {
  id: string;
  personPhotoId: string;
  resultUrl: string;
  status: 'processing' | 'completed' | 'failed';
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  blockedPhotos: string[];
}
```

---

## 5. Acceptance Criteria

### 5.1 Core Functionality
- [ ] User can upload multiple person photos
- [ ] User can upload or select clothing image
- [ ] System correctly detects clothing category
- [ ] System correctly detects person type
- [ ] Validation blocks mismatched combinations
- [ ] Generation produces try-on results
- [ ] All results displayed in grid
- [ ] Comparison view shows side-by-side

### 5.2 UX Quality
- [ ] Smooth transitions between states
- [ ] Progress feedback during generation
- [ ] Clear error messages for validation failures
- [ ] Responsive layout on different screens

### 5.3 Visual Quality
- [ ] Dark theme applied consistently
- [ ] Accent color used appropriately
- [ ] Cards have proper shadows and borders
- [ ] Hover states provide feedback