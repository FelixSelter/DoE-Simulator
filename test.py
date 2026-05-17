import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("~/Desktop/measurements.csv")
df = df.sort_values(["Run"]).reset_index(drop=True)

batch_size = 1000
num_batches = 5

titles = [
    "Uniform absolute ±5",
    "Uniform percentage ±5%",
    "Normal absolute ±5",
    "Normal percentage ±5%",
    "Normal variance coefficient (CV = 10%)",
]

colors = ["#4C72B0", "#55A868", "#C44E52", "#8172B3", "#DD8452"]

fig, axs = plt.subplots(2, 3, figsize=(18, 10))
axs = axs.flatten()

for i in range(num_batches):
    batch = df.iloc[i * batch_size:(i + 1) * batch_size]
    x = batch["x"].dropna()

    mean = x.mean()
    std = x.std()

    xmin = x.min()
    xmax = x.max()

    ax = axs[i]

    ax.hist(
        x,
        bins=30,
        density=True,
        alpha=0.75,
        color=colors[i],
        edgecolor="white",
        linewidth=0.6,
    )

    ax.axvline(mean, color="#D62728", linestyle="--", linewidth=2, label=f"mean = {mean:.2f}")
    ax.axvline(xmin, color="black", linestyle=":", linewidth=1, label=f"min = {xmin:.2f}")
    ax.axvline(xmax, color="black", linestyle=":", linewidth=1, label=f"max = {xmax:.2f}")

    # -------------------------
    # in-range stats
    # -------------------------
    if i == 2:
        lower, upper = 165 - 5, 165 + 5
        in_range = x.between(lower, upper).sum()
        pct = 100 * in_range / len(x)
        range_label = f"in [160,170]: {pct:.2f}%"

    elif i == 3:
        lower, upper = 165 - 8.25, 165 + 8.25
        in_range = x.between(lower, upper).sum()
        pct = 100 * in_range / len(x)
        range_label = f"in [156.75,173.25]: {pct:.2f}%"

    elif i == 4:
        lower, upper = 165 - 33, 165 + 33
        in_range = x.between(lower, upper).sum()
        pct = 100 * in_range / len(x)
        range_label = f"in [132,198]: {pct:.2f}%"

    else:
        range_label = ""

    ax.set_title(
        f"{titles[i]}\n{range_label}",
        fontsize=11,
    )

    ax.set_xlabel("x")
    ax.set_ylabel("density")
    ax.grid(True, alpha=0.2)
    ax.legend()

axs[5].axis("off")

plt.tight_layout()
plt.show()