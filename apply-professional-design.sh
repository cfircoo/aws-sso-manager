#!/bin/bash

# Script to apply professional design changes to AWS SSO Manager v2.0.0

echo "🎨 Applying Professional Design System to AWS SSO Manager..."

# 1. Backup current CSS
echo "📦 Creating backup of current styles..."
cp src/index.css src/index-colorful-backup.css

# 2. Apply professional CSS
echo "🎨 Applying professional design system..."
cp src/index-professional.css src/index.css

# 3. Update BuyMeCoffeeButton
echo "☕ Updating Buy Me a Coffee button..."
cp src/components/BuyMeCoffeeButton-professional.tsx src/components/BuyMeCoffeeButton.tsx

# 4. Update components with inline styles
echo "🔧 Updating component styles..."

# Update KubernetesClustersDialog.tsx - remove bright gradients
sed -i '' 's/linear-gradient(135deg, #F97316 0%, #DC2626 100%)/var(--color-primary)/g' src/components/KubernetesClustersDialog.tsx
sed -i '' 's/linear-gradient(135deg, #10B981, #059669)/var(--color-success)/g' src/components/KubernetesClustersDialog.tsx
sed -i '' 's/linear-gradient(135deg, #EF4444, #DC2626)/var(--color-error)/g' src/components/KubernetesClustersDialog.tsx
sed -i '' 's/linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)/var(--color-primary)/g' src/components/KubernetesClustersDialog.tsx
sed -i '' 's/rgba(0, 0, 0, 0.8)/rgba(0, 0, 0, 0.6)/g' src/components/KubernetesClustersDialog.tsx

# 5. Update Header component animations
echo "📱 Updating Header component..."
# Remove pulse animations
sed -i '' 's/animate-pulse//g' src/components/Header.tsx
sed -i '' 's/animate-glow//g' src/components/Header.tsx

# 6. Update AccountCard and AccountItem hover effects
echo "📇 Updating account card styles..."
sed -i '' 's/transform: translateY(-4px)/transform: translateY(-2px)/g' src/components/AccountCard.tsx
sed -i '' 's/transform: translateY(-4px)/transform: translateY(-2px)/g' src/components/AccountItem.tsx

# 7. Create a professional theme toggle icon style
echo "🌓 Updating theme toggle..."
cat > src/components/ThemeToggle-update.tsx << 'EOF'
// Add these style updates to ThemeToggle.tsx
const professionalStyles = {
  button: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all var(--transition-smooth)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonHover: {
    background: 'var(--bg-secondary)',
    borderColor: 'var(--color-primary)',
    transform: 'translateY(-1px)'
  }
};
EOF

# 8. Update toast notification styles
echo "🔔 Creating professional toast styles..."
cat > src/components/toast-professional.tsx << 'EOF'
// Professional toast styles
export const professionalToastStyles = {
  success: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--color-success)',
    borderLeft: '4px solid var(--color-success)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-lg)'
  },
  error: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--color-error)',
    borderLeft: '4px solid var(--color-error)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-lg)'
  },
  info: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--color-info)',
    borderLeft: '4px solid var(--color-info)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-lg)'
  }
};
EOF

# 9. Create migration guide
echo "📚 Creating migration guide..."
cat > DESIGN_MIGRATION.md << 'EOF'
# Design Migration Guide

## Changes Applied

1. **Color Palette**
   - Primary: Orange → Indigo (#4F46E5)
   - Gradients → Solid colors
   - Reduced transparency in glass effects
   - Muted status colors

2. **Components Updated**
   - BuyMeCoffeeButton: Yellow gradient → Subtle support button
   - Buttons: Gradient → Solid with subtle hover
   - Cards: Reduced shadow and hover effects
   - Modals: Less blur, more opacity

3. **Animations**
   - Removed pulse and glow effects
   - Reduced transition durations
   - Subtle transform on hover only

4. **Typography**
   - Better contrast ratios
   - Consistent font weights
   - Professional hierarchy

## Manual Updates Needed

1. Test all components in both light and dark modes
2. Update any hardcoded color values in components
3. Review and update documentation screenshots
4. Test accessibility with new color scheme

## Rollback

To rollback to the colorful design:
```bash
cp src/index-colorful-backup.css src/index.css
```
EOF

echo "✅ Professional design system applied successfully!"
echo "📋 Please review DESIGN_MIGRATION.md for details"
echo "🧪 Remember to test all components in both themes"
