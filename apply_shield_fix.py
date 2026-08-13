#!/usr/bin/env python3
"""Apply shield consumption to all remaining hit points in missiles.js."""

path = '/home/nova/3d-space-invaders/js/missiles.js'

with open(path, 'r') as f:
    content = f.read()

# The pattern to find and replace
old = """                // Decrease lives
                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }"""

new = """                // Shield check: absorb hit if shield active
                if (consumeShield()) {
                    console.log("Shield absorbed the hit!");
                } else {
                    // Decrease lives
                    const newLives = livesCallback();
                    if (newLives <= 0) {
                        gameOverCallback(false);
                    }
                }"""

count = content.count(old)
print(f"Found {count} occurrences")

if count > 0:
    new_content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(new_content)
    print(f"Replaced {count} occurrences")
else:
    print("Searching for alternative patterns...")
    # Try with different indentation (no // Decrease lives comment)
    old2 = """                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }"""
    
    count2 = content.count(old2)
    print(f"Found {count2} occurrences without Decrease lives comment")
    
    if count2 > 0:
        new2 = """                // Shield check: absorb hit if shield active
                if (consumeShield()) {
                    console.log("Shield absorbed the hit!");
                } else {
                    // Decrease lives
                    const newLives = livesCallback();
                    if (newLives <= 0) {
                        gameOverCallback(false);
                    }
                }"""
        new_content = content.replace(old2, new2)
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Replaced {count2} occurrences")
    
    # Also check for 4-space indentation
    old3 = """            const newLives = livesCallback();
            if (newLives <= 0) {
                gameOverCallback(false);
            }"""
    
    count3 = content.count(old3)
    print(f"Found {count3} occurrences with 12-space indent")
    
    if count3 > 0:
        new3 = """            // Shield check: absorb hit if shield active
            if (consumeShield()) {
                console.log("Shield absorbed the hit!");
            } else {
                // Decrease lives
                const newLives = livesCallback();
                if (newLives <= 0) {
                    gameOverCallback(false);
                }
            }"""
        new_content = content.replace(old3, new3)
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Replaced {count3} occurrences")
    
    # Check for 20-space indent (deeper nesting)
    old4 = """                    const newLives = livesCallback();
                    if (newLives <= 0) {
                        gameOverCallback(false);
                    }"""
    
    count4 = content.count(old4)
    print(f"Found {count4} occurrences with 20-space indent")
    
    if count4 > 0:
        new4 = """                    // Shield check: absorb hit if shield active
                    if (consumeShield()) {
                        console.log("Shield absorbed the hit!");
                    } else {
                        // Decrease lives
                        const newLives = livesCallback();
                        if (newLives <= 0) {
                            gameOverCallback(false);
                        }
                    }"""
        new_content = content.replace(old4, new4)
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Replaced {count4} occurrences")

print("Done!")