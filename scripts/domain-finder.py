#!/usr/bin/env python3
"""
Domain Name Finder for Habits App
Generates .com domain ideas using Claude CLI and checks availability.
"""

import subprocess
import re
import sys

# App context for domain generation
APP_CONTEXT = """
AI-powered personal fitness training PWA called "Habits" with features:
- Guided workout timer with audio countdown and exercise illustrations
- AI personal trainer chat with voice input/output
- Personalized 7-day workout plans based on equipment and goals
- Streak tracking and gamification (fire emoji, confetti celebrations)
- Post-workout difficulty feedback and auto-adjustments
- Mobile-first installable app

Target users: People wanting daily guided home workouts with AI coaching.
Themes: fitness, habits, AI coach, daily routines, personal training, workout guide, fit life
"""

def generate_domains(batch_num: int, existing: list[str]) -> list[str]:
    """Use Claude CLI to generate domain name ideas."""

    exclude_list = ", ".join(existing[-50:]) if existing else "none yet"

    prompt = f"""Generate exactly 20 creative .com domain name ideas for this app:

{APP_CONTEXT}

Requirements:
- Only .com domains
- Short, memorable, brandable (ideally 6-12 chars)
- No hyphens or numbers
- Mix of: compound words, portmanteaus, invented words, action words
- Already tested (DO NOT suggest these): {exclude_list}

Output ONLY the domain names, one per line, without .com suffix.
Example format:
fithabit
dailyburn
coachly"""

    try:
        result = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            print(f"Claude CLI error: {result.stderr}")
            return []

        # Parse domain names from output
        lines = result.stdout.strip().split("\n")
        domains = []
        for line in lines:
            # Clean up the line - extract just the domain name
            name = line.strip().lower()
            name = re.sub(r'\.com$', '', name)  # Remove .com if present
            name = re.sub(r'^[\d\.\-\*\s]+', '', name)  # Remove leading numbers/bullets
            name = re.sub(r'[^a-z]', '', name)  # Keep only letters

            if name and len(name) >= 3 and name not in existing:
                domains.append(name)

        return domains[:20]

    except subprocess.TimeoutExpired:
        print("Claude CLI timed out")
        return []
    except FileNotFoundError:
        print("Error: 'claude' CLI not found. Install it first.")
        sys.exit(1)


def check_domain_whois(domain: str) -> bool:
    """Check domain availability using whois. Returns True if available."""
    try:
        result = subprocess.run(
            ["whois", f"{domain}.com"],
            capture_output=True,
            text=True,
            timeout=10
        )
        output = result.stdout.lower() + result.stderr.lower()

        # Domain is available if these patterns found
        available_patterns = [
            "no match",
            "not found",
            "no entries found",
            "no data found",
            "domain not found",
            "no whois data",
        ]

        return any(p in output for p in available_patterns)

    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False


def check_domain_nslookup(domain: str) -> bool:
    """Check domain availability using nslookup. Returns True if available."""
    try:
        result = subprocess.run(
            ["nslookup", f"{domain}.com"],
            capture_output=True,
            text=True,
            timeout=5
        )
        output = result.stdout.lower() + result.stderr.lower()

        # NXDOMAIN means domain doesn't exist (available)
        return "nxdomain" in output or "can't find" in output

    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False


def check_domain(domain: str) -> bool:
    """Check domain availability using whois first, then nslookup as backup."""
    # Try whois first (more reliable)
    if check_domain_whois(domain):
        return True
    # Fallback to nslookup
    return check_domain_nslookup(domain)


def main():
    print("=" * 60)
    print("🔍 Domain Name Finder for Habits App")
    print("=" * 60)

    all_tested = []
    available = []
    target_total = 100
    batch_size = 20
    batch_num = 0

    while len(all_tested) < target_total:
        batch_num += 1
        remaining = target_total - len(all_tested)

        print(f"\n📝 Batch {batch_num}: Generating domain ideas...")
        domains = generate_domains(batch_num, all_tested)

        if not domains:
            print("No domains generated, retrying...")
            continue

        print(f"   Generated {len(domains)} new ideas")
        print(f"\n🔎 Testing availability...")

        for domain in domains:
            if domain in all_tested:
                continue

            all_tested.append(domain)
            is_available = check_domain(domain)

            status = "✅ AVAILABLE" if is_available else "❌ taken"
            print(f"   {domain}.com - {status}")

            if is_available:
                available.append(domain)

        # Progress update
        print(f"\n📊 Progress: {len(all_tested)}/{target_total} tested, {len(available)} available")

        if len(all_tested) >= target_total:
            break

    # Final summary
    print("\n" + "=" * 60)
    print("🎉 RESULTS")
    print("=" * 60)
    print(f"Total tested: {len(all_tested)}")
    print(f"Available domains: {len(available)}")

    if available:
        print("\n✅ Available .com domains:")
        for domain in available:
            print(f"   • {domain}.com")
    else:
        print("\n😔 No available domains found")

    # Save results
    with open("domain-results.txt", "w") as f:
        f.write("AVAILABLE DOMAINS:\n")
        for d in available:
            f.write(f"{d}.com\n")
        f.write(f"\nTESTED ({len(all_tested)} total):\n")
        for d in all_tested:
            f.write(f"{d}.com\n")

    print(f"\n💾 Results saved to domain-results.txt")


if __name__ == "__main__":
    main()
