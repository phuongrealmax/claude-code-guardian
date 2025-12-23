# CCG Pricing & Licensing

Code Guardian Studio offers three tiers to fit your needs.

## Pricing Tiers

### Dev (Free)

Perfect for individual developers and open-source projects.

**Included Features:**
- Session Management (save/resume)
- Persistent Memory
- Guard (code validation)
- Workflow Management
- Code Optimizer
- Resource Management
- Process Management
- Progress Dashboard
- Context Profiles
- CCG Natural Language Interface

**Limits:**
- Single user
- Community support

---

### Team ($19/month)

For professional developers and small teams who need advanced features.

**Everything in Dev, plus:**
- **Latent Chain** - Multi-phase reasoning for complex tasks
- **AutoAgent** - Automatic task decomposition and error fixing
- **Thinking** - Structured reasoning models and workflows
- **RAG** - Semantic code search with embeddings
- **Agents** - Multi-agent coordination
- **Testing** - Advanced test runner with browser testing
- **Documents** - Documentation management
- Priority email support

**Limits:**
- Up to 5 seats per license
- Team collaboration features

---

### Enterprise (Custom)

For organizations requiring advanced security, compliance, and support.

**Everything in Team, plus:**
- SSO/SAML integration
- Audit logs
- SOC2 compliance features
- Dedicated support
- Custom integrations
- Unlimited seats
- Multi-repo support
- CI/CD integration
- PR comments integration

[Contact Sales](https://codeguardian.studio/pricing)

---

## Feature Comparison

| Feature | Dev | Team | Enterprise |
|---------|:---:|:----:|:----------:|
| Session Management | ✅ | ✅ | ✅ |
| Memory System | ✅ | ✅ | ✅ |
| Guard (Validation) | ✅ | ✅ | ✅ |
| Workflow Management | ✅ | ✅ | ✅ |
| Code Optimizer | ✅ | ✅ | ✅ |
| Resource Management | ✅ | ✅ | ✅ |
| Process Management | ✅ | ✅ | ✅ |
| Progress Dashboard | ✅ | ✅ | ✅ |
| Context Profiles | ✅ | ✅ | ✅ |
| Latent Chain | ❌ | ✅ | ✅ |
| AutoAgent | ❌ | ✅ | ✅ |
| Thinking Models | ❌ | ✅ | ✅ |
| RAG Search | ❌ | ✅ | ✅ |
| Multi-Agent | ❌ | ✅ | ✅ |
| Advanced Testing | ❌ | ✅ | ✅ |
| Documents Module | ❌ | ✅ | ✅ |
| SSO/SAML | ❌ | ❌ | ✅ |
| Audit Logs | ❌ | ❌ | ✅ |
| SOC2 Compliance | ❌ | ❌ | ✅ |
| Dedicated Support | ❌ | ❌ | ✅ |

---

## Activating Your License

### 1. Purchase a License

Visit [codeguardian.studio/pricing](https://codeguardian.studio/pricing) to purchase a Team or Enterprise license.

### 2. Receive Your License Key

After purchase, you'll receive a license key via email in the format:
```
CGS-TEAM-XXXX-XXXX
```

### 3. Activate in Your Project

Save the license key to your project:

```bash
# Create .ccg directory if it doesn't exist
mkdir -p .ccg

# Save license key
echo "CGS-TEAM-XXXX-XXXX" > .ccg/license.key

# Add to .gitignore (important!)
echo ".ccg/license.key" >> .gitignore
```

### 4. Verify Activation

The license is automatically verified when CCG starts. Premium features will be unlocked.

---

## License Gating Behavior

When you try to use a premium feature without the appropriate license:

```json
{
  "success": false,
  "error": "This feature requires Team tier. You are on Dev (Free). Upgrade at https://codeguardian.studio/pricing",
  "licenseRequired": true,
  "requiredTier": "team",
  "currentTier": "dev",
  "upgradeUrl": "https://codeguardian.studio/pricing"
}
```

---

## FAQ

### Can I try Team features before purchasing?

We offer a 14-day free trial. Contact us at hello@codeguardian.studio.

### What happens when my subscription expires?

Premium features will be gated, but your data remains accessible. Dev tier features continue to work.

### Can I upgrade from Team to Enterprise?

Yes! Contact sales and we'll prorate your existing subscription.

### Is there a discount for annual billing?

Yes, annual billing saves 20%. See pricing page for details.

---

## Support

- **Dev tier**: Community support via GitHub Issues
- **Team tier**: Priority email support
- **Enterprise**: Dedicated support channel

---

*Last updated: 2025-12-23*
