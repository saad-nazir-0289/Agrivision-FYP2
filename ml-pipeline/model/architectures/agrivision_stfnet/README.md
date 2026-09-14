# AgriVision-STFNet - Proposed Fusion Architecture

**Status:** basic architecture proposal (this doc + `notebook.ipynb`), not yet trained.
**Implements:** PB-05, PB-06 · UC-04 · SDS §3.1.5 ("Model Inference Module - architecture
not yet selected"). This document is that decision, made traceable to the PRISMA SLR in
`docs/PRISMA_SLR.xlsx`.

> Companion notebook: [`ml-pipeline/notebooks/01-agrivision-stfnet-outline.ipynb`](../../../notebooks/01-agrivision-stfnet-outline.ipynb)
> walks through every block below as runnable code with a dummy-tensor forward pass. This
> file is the *why*; the notebook is the *what the code looks like*. Neither is a trained
> model - no data loader, training loop, or checkpoint exists yet (see [Scope](#scope-what-this-is-not)).

## 1. The question this doc answers

The proposed pipeline was:

```
Sentinel-2 + MODIS  →  CNN Encoder  →  Residual Blocks  →  Multiscale Module
                     →  Transformer  →  CBAM  →  Feature Fusion  →  CNN Decoder
                     →  Sentinel-2-like image + NDVI
```

Before writing code, every block was checked against the 14 papers that survived full-text
screening in the project's own PRISMA SLR (`docs/PRISMA_SLR.xlsx`, sheet `9. Full text
relevancy log`) to see whether the literature actually supports it, whether it's
over-engineered, and whether anything cheaper does the same job. Section 3 is that
paper-by-paper check. The short answer: **yes, it makes sense** - every block maps to a
specific, named mechanism in at least one included paper - but a straight reading of the
SLR also argues for two simplifications that keep the model small, which Section 4
explains.

## 2. What the SLR actually contains

Of the 14 included papers, only **4 are deep-learning spatial-fusion architectures**
(the ones a "CNN/Transformer" pipeline should be compared against); the other 10 are
classical/statistical baselines or reviews. That split matters for the defense: it means
there is no single canonical DL architecture in this sub-field to copy - the recent DL
papers instead *converge* on a shared recipe (CNN backbone + residual connections +
multiscale features + some form of attention), and this design synthesizes that
convergence rather than inventing something unsupported.

| # | Paper (short) | Year | Category | What it establishes |
|---|---|---|---|---|
| 1 | STARFM on Landsat 8/Sentinel-2 NDVI, Bavaria | 2022 | Classical baseline | Moving-window weighted blending, **no learned features**; known accuracy ceiling and blockiness over heterogeneous small fields - the gap a learned model is meant to close. |
| **2** | **MARSTFN** - Deep learning STF architecture of Landsat 8 + Sentinel-2 for 10 m imagery (Cheng et al.) | 2024 | **DL - direct precedent** | Explicitly combines a **multiscale mechanism**, an **attention mechanism (CBAM)**, and a **residual network** via a "channel/spatial-attention-coupled residual dense block" (CSARDB). This is the closest single paper to the proposed pipeline - it validates the residual + multiscale + CBAM combination almost block-for-block. |
| 3 | GA-ANN NDVI reconstruction | 2023 | Classical ML | Genetic-algorithm-tuned shallow ANN, pixel-wise, no spatial context window - motivates a spatially-aware CNN over a per-pixel regressor. |
| 4 | Deep-learning-enhanced fusion, Danjiang River Basin | 2023 | DL | Confirms DL fusion beats classical fusion for long-term NDVI/vegetation-cover reconstruction accuracy. |
| 5 | ReVIChina reconstructed NDVI/EVI dataset | 2023 | Statistical, interannual | Spatial-interannual gap-filling - a different problem (temporal continuity of a coarse product), not spatial detail injection. Confirms our task (spatial fusion) is the harder, distinct problem. |
| 6 | NDVI reconstruction via differential smoothness | 2026 | Classical/statistical | Temporal-domain smoothing; cannot add spatial resolution MODIS never had. |
| **7** | **CRFNet** - Radar-optical fusion, Sentinel-1/2, Kuala Selangor | 2025 | **DL - direct precedent** | Hybrid **CNN–BiLSTM–multi-head-attention** architecture; reports R² > 0.82, RMSE < 0.12 - close to this project's own acceptance target (R² ≥ 0.80, RMSE < 0.10, SRS §NFR) and a second independent confirmation that CNN+attention hybrids outperform CNN-only. |
| 8 | Review: NDVI time-series reconstruction techniques (Li et al.) | 2021 | Review | Classifies methods as temporal / frequency / hybrid; frames why spatial fusion (this project) is a different problem from pure temporal gap-filling (most of the other 13 papers). |
| 9 | IGFUL - gap-filling, unmixing, learning | 2026 | Statistical + ML | Coarse (GLASS 250 m) + fine (Landsat 30 m) combination via unmixing, not a CNN - confirms coarse+fine combination is a recurring, generalizable idea across very different sensor pairs, independent of the exact method used. |
| 10 | InENVI - environmental-variable-augmented STF | 2024 | ML regression | R² > 0.90 by adding auxiliary environmental covariates (temperature, precipitation, etc.). Not core to this design, but documented as a concrete future extension point (§6). |
| 11 | VSDF + Savitzky–Golay, Shiyang River, MODIS+Landsat-8/9 | 2025 | Classical | Another non-DL fusion + temporal-filter baseline. |
| 12 | IESTARFM, wetland vegetation phenology, cloud-prone regions | 2026 | Classical (enhanced STARFM) | Confirms even the improved classical family is still window-based, non-learned. |
| **13** | **Target self-attention STF**, 500 m NDVI since 1984 | 2026 | **DL - direct precedent** | Explicit **self-attention/transformer** block inside a spatiotemporal-fusion pipeline for NDVI. Directly grounds the "Transformer" stage of the proposed pipeline (adjacent literature found during citation search - Coastal-GLFT, TTSM - reports the same finding: self-attention captures long-range/non-local spatial dependencies that a CNN's local receptive field misses). |
| 14 | EGF-WS - gap-filling + Whittaker smoothing, Landsat 8 + Sentinel-2 + MODIS | 2023 | Statistical | Uses the **exact 3-sensor stack** this project plans (MODIS/Sentinel-2, Landsat optional), but purely statistically - motivates a learned nonlinear coarse→fine mapping as the DL alternative to smoothing. |
| 15 | *(excluded: EC7, non-English)* | - | - | - |

Every row is a real paper from the project's own SLR; none were substituted.

## 3. Component-by-component defense

| Block | Literature grounding | Why it's here / what it's *for* |
|---|---|---|
| **CNN Encoder** | Universal in all four DL papers above (#2, #4, #7, #13) and every classical baseline implicitly assumes spatial-neighborhood context too. | Extracts local spectral–spatial features from the MODIS+Sentinel-2 input before anything else can act on them. Cheapest possible first stage (plain convs), no design risk. |
| **Residual Blocks** | MARSTFN's residual dense block (#2). | Lets the network go deep enough to model the MODIS↔Sentinel-2 mapping without vanishing gradients, at the cost of a simple skip-add (no extra parameters beyond the convs already needed). |
| **Multiscale Module** | MARSTFN's named "multiscale mechanism" (#2). | MODIS (250 m) is **25× coarser** than Sentinel-2 (10 m); Punjab field sizes are 2–10 ha (SRS §1.2). A single conv kernel size can't represent both "this whole coarse MODIS pixel" and "this one field's edge" at once - parallel dilated/pooled branches (ASPP-style) can, in one block, instead of stacking many plain conv layers. |
| **Transformer (self-attention)** | Target self-attention STF (#13); CRFNet's multi-head attention (#7); general finding repeated across adjacent STF literature that self-attention captures **non-local** structure (repeated field/canal layouts) a CNN's local receptive field cannot reach without excessive depth. | Placed **once**, at the encoder's most-downsampled ("bottleneck") resolution - the standard hybrid CNN-Transformer trick (also used in TransUNet-style architectures) to make self-attention affordable. See §4 for the actual cost numbers. |
| **CBAM** | MARSTFN's CSARDB = CBAM fused with a residual block (#2). | Channel-attention + spatial-attention refinement for <1% of the model's parameters (Woo et al., 2018 - outside the SLR's own literature but the standard citation for CBAM itself). Deliberately used *instead of* a second, more expensive attention stage - see §4. |
| **Feature Fusion** | The defining operation of "spatiotemporal fusion" per the SLR's own Inclusion Criterion IC1 (`docs/PRISMA_SLR.xlsx`, sheet `6`) - every included paper has some fusion step, whether weighted blending (STARFM family), unmixing (IGFUL), or a learned merge (MARSTFN, CRFNet). | Realized here as a **skip connection**: the CBAM-refined bottleneck features, once upsampled back to full resolution, are merged with the raw encoder features via a 1×1 conv - the same role a U-Net-style skip plays, stabilizing decoder training and carrying forward fine spatial detail the bottleneck may have lost. (Concatenation needs matching spatial size, so in code this runs interleaved with decoder upsampling rather than strictly before it - see the notebook's §6 note.) |
| **CNN Decoder** | Mirrors every encoder above (#2, #4, #7). | Upsamples the fused features back to full Sentinel-2 grid resolution and regresses reconstructed reflectance bands. |
| **NDVI output** | SRS §NFR: *"NDVI values must fall strictly within [-1, 1]"*; SDS §Preprocessing Module: NDVI is always computed from red/NIR reflectance, never predicted directly. | **Not a learned head.** NDVI is computed analytically from the decoder's own reconstructed Red/NIR bands via the standard formula (see §4) - this is the single biggest simplicity win in the design, explained below. |

## 4. Where the "simple + cheap, same output" decisions are

The user's brief explicitly rewards a model that is simple, understandable, and cheap
without giving up accuracy. Four concrete decisions do that, and each is a deviation
*from the more expensive version the literature would also support* - documented here
so it can be defended as a deliberate trade-off, not an oversight:

1. **One shared encoder–decoder stream, not two parallel towers.**
   MODIS (already resampled to the 10 m grid upstream, per
   [`preprocessing/README.md`](../../../preprocessing/README.md)) and the Sentinel-2
   reference are concatenated channel-wise *before* the CNN encoder ("early fusion")
   instead of running two full encoder towers and fusing late. This is roughly **half**
   the compute/parameters of a dual-branch design, and several reviewed papers (e.g. the
   VSDF/EGF-WS family, #11/#14) already treat the coarse-resampled-to-fine input as a
   single stacked tensor rather than a separate tower. Documented trade-off: a dual-branch
   design with cross-attention fusion is the natural upgrade path if this proves
   insufficient - the module is built to be swapped, per SDS §3.1.5 ("replaceable
   component").

2. **A single Transformer block, applied only at the bottleneck.**
   Self-attention cost is O((H·W)²) in the number of spatial tokens. Running it at the
   input resolution would be the most expensive part of the model by a huge margin. By
   the time the CNN encoder has downsampled 8× (three stride-2 convs), a 256×256 input
   becomes 32×32 = 1,024 tokens instead of 65,536 - attention cost drops by
   (65536/1024)² ≈ **4,096×** relative to doing it at full resolution, for the same
   "look anywhere in the scene" capability. One block is enough to add global context;
   stacking several (as a full Vision Transformer would) was judged not worth the added
   cost for a first architecture, and no included paper's abstract described using more
   than a lightweight attention stage either.

3. **CBAM instead of a second attention stage.**
   CBAM's channel+spatial attention adds well under 1% of the model's parameters (Woo et
   al., 2018) versus the transformer block's cost above. Splitting attention duties this
   way - CBAM for cheap, everywhere, local re-weighting; the one Transformer block
   reserved for the one place non-local reasoning actually matters - is the core
   cost-saving idea in this design, and it's exactly the pairing MARSTFN (#2) already
   validated (its CSARDB module *is* CBAM + residual, no transformer, and it still
   outperformed its non-attention baselines).

4. **NDVI computed analytically, not learned.**
   The decoder's reflectance head ends in a sigmoid, so its Red and NIR output channels
   are bounded to [0, 1] by construction. NDVI is then
   `(NIR − Red) / (NIR + Red + ε)` computed directly from those two channels - algebraically,
   if `NIR, Red ∈ [0, 1]`, the result is guaranteed to fall inside (−1, 1) with **no
   extra parameters, no extra loss term, and no clamping logic** needed to satisfy the
   SRS's `[-1, 1]` requirement. It also guarantees the NDVI map is always numerically
   consistent with the reconstructed image (no risk of a separate learned head
   disagreeing with the reflectance output).

5. **No GAN.** The SLR literature does include GAN-based fusion approaches (noted during
   adjacent-literature search, outside the final 14), but the SRS's determinism
   requirement - *"deterministic outputs for identical preprocessed input tensors under
   the same model checkpoint"* (SRS §NFR-Reliability) - argues against adversarial
   training's instability and, for some GAN variants, stochastic sampling. A feed-forward
   regressor trained with a plain reconstruction loss is the defensible choice here, not
   just the simpler one.

### Measured, not estimated

The dummy-tensor forward pass in the notebook reports real numbers, not guesses:
**1,778,359 parameters (~7.1 MB as float32)** for a 256×256, 8-band input. Per-stage
breakdown:

| Stage | Parameters | Share |
|---|---:|---:|
| Transformer (bottleneck) | 656,768 | 37% |
| Residual Blocks | 591,360 | 33% |
| CNN Encoder | 242,976 | 14% |
| Decoder upsampling | 180,608 | 10% |
| Multiscale Module | 99,008 | 6% |
| CBAM | 4,339 | **0.2%** |
| Feature Fusion | 2,144 | 0.1% |
| Output head | 1,156 | 0.1% |

CBAM's 0.2% share is exactly the "near-zero cost" claim in point 3 above, confirmed
rather than assumed. The transformer's share is dominated by its learned positional
embedding table (`max_tokens=4096` → 4096×128 ≈ 524K parameters on its own - most of
that stage's total) rather than the attention math itself; this is sized generously so
the notebook's demo patch size (256×256 → 1,024 bottleneck tokens) fits with headroom,
and should be right-sized to the actual training patch size later rather than left at
this placeholder - an honest limitation, not a hidden one.

## 5. How this maps to the project's own requirements

| Requirement (SRS / SDS) | How the design addresses it |
|---|---|
| R² ≥ 0.80, RMSE < 0.10 vs. held-out Sentinel-2 (SRS release criteria) | Directly comparable DL precedents in the SLR report R² 0.82–0.90+ with similar hybrid CNN+attention designs (#7, #10) - the target is in range for this class of model, not aspirational. |
| NDVI ∈ [-1, 1] (SRS NFR; SDS Preprocessing Module) | Guaranteed algebraically by the sigmoid-bounded reflectance head (§4.4), not by post-hoc clamping. |
| Deterministic output for identical input + checkpoint (SRS NFR-Reliability) | Pure feed-forward CNN/attention stack, no sampling, no GAN, no dropout at inference time. |
| ≤ 5 s inference for a 10 km × 10 km AOI on GPU (SRS NFR-Performance) | Small channel widths (32→64→128) and a single bottleneck-only attention block keep both parameter count and FLOPs low relative to deeper literature designs - to be confirmed empirically once trained (see [Scope](#scope-what-this-is-not)). |
| "Model inference service is treated as replaceable" (SDS §3.1.5) | Every block is its own class (`CNNEncoder`, `ResBlock`, `MultiScaleModule`, `TransformerBottleneck`, `CBAM`, `CNNDecoder`) in the notebook - any one can be swapped without touching the others. |

## 6. Scope: what this is not

This is an **architecture proposal**, checked against the literature and runnable on
dummy tensors (see the notebook for a shape/parameter-count smoke test) - it is
deliberately *not*:

- trained, or trained on real MODIS/Sentinel-2 data (`data_acquisition/` and
  `preprocessing/` come first, per `PROJECT_STATUS.md`'s own build order);
- benchmarked against the classical baselines (STARFM/FSDAF) it's meant to beat;
- tuned for the actual channel counts, patch size, or normalization the final
  preprocessing pipeline settles on.

**Documented future extensions**, not built now, to keep this version basic:
auxiliary environmental covariates as extra input channels (InENVI, #10); a dual-branch
encoder with learned cross-attention fusion if early fusion underperforms (§4.1); a
deeper transformer stack if a single block proves insufficient for long-range context.

## 7. References

Numbered items are the papers this document cites by number from
`docs/PRISMA_SLR.xlsx`, sheet `9. Full text relevancy log` (same numbering as §2/§3
above). CBAM (Woo et al., 2018, *CBAM: Convolutional Block Attention Module*, ECCV) is
cited for the attention-module mechanism itself and is outside the SLR's 14 papers, same
as it is a standard architectural component, not a spatiotemporal-fusion study.
