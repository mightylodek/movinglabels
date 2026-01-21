# Upgrade Notes

## Multer v2.0.2 Upgrade

Updated from `multer@^1.4.5-lts.1` to `multer@^2.0.2` to address security vulnerabilities.

### Changes:
- **Version**: 1.4.5-lts.1 → 2.0.2
- **Security**: Patches CVE-2025-48997 and memory leak vulnerabilities
- **Breaking Changes**: None affecting our usage (diskStorage API remains the same)

### Compatibility:
✅ No code changes required - the existing multer configuration is compatible with v2.0.2

### To apply the upgrade:

```bash
# Remove old version and install new one
npm uninstall multer
npm install multer@^2.0.2

# Or simply update package.json and run:
npm install
```

### Verification:
After upgrading, test photo upload functionality to ensure everything works correctly.
