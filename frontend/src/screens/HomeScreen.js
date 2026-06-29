import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col } from 'react-bootstrap'
import Product from '../components/Product'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import ProductCarousel from '../components/ProductCarousel'
import Meta from '../components/Meta'
import { listProducts } from '../actions/productActions'

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&family=Nunito+Sans:wght@400;600;700;800;900&display=swap');

  :root {
    --lh-bg: #070914;
    --lh-paper: rgba(255, 255, 255, 0.06);
    --lh-paper-strong: rgba(255, 255, 255, 0.1);
    --lh-ink: #eef0f7;
    --lh-sub: rgba(238, 240, 247, 0.72);
    --lh-line: rgba(255, 255, 255, 0.1);
    --lh-dark: #09111c;
    --lh-dark-soft: #121b2a;
    --lh-accent: #3ee7c3;
    --lh-accent-soft: #d8c58c;
    --lh-blue: #88aef0;
    --lh-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
  }

  body {
    font-family: 'Nunito Sans', sans-serif !important;
    background:
      radial-gradient(1100px 520px at 0% 0%, rgba(62, 231, 195, 0.12), transparent 60%),
      radial-gradient(900px 460px at 100% 5%, rgba(216, 197, 140, 0.12), transparent 55%),
      linear-gradient(180deg, #070914 0%, #0c1020 100%);
    color: var(--lh-ink);
  }

  .luxHome,
  .luxHome * {
    box-sizing: border-box;
  }

  .luxHome {
    color: var(--lh-ink);
    padding: 16px 0 36px;
  }

  .luxHome a {
    color: inherit;
  }

  .luxHome h1,
  .luxHome h2,
  .luxHome h3,
  .luxHome h4,
  .luxHome h5,
  .luxHome h6 {
    color: var(--lh-ink) !important;
  }

  .luxShell {
    position: relative;
    overflow: hidden;
    border-radius: 34px;
    padding: 28px;
    background:
      linear-gradient(145deg, rgba(9, 17, 28, 0.96), rgba(12, 17, 33, 0.92)),
      radial-gradient(circle at top right, rgba(62, 231, 195, 0.08), transparent 36%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: var(--lh-shadow);
  }

  .luxShell::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(120deg, rgba(255,255,255,0.06), transparent 30%),
      radial-gradient(700px 280px at 80% -10%, rgba(136, 174, 240, 0.08), transparent 60%);
  }

  .luxHero {
    position: relative;
    margin-bottom: 26px;
  }

  .luxHeroPanel {
    position: relative;
    z-index: 1;
    overflow: hidden;
    padding: 34px 34px 26px;
    border-radius: 30px;
    background:
      radial-gradient(540px 280px at 100% 0%, rgba(62, 231, 195, 0.16), transparent 60%),
      radial-gradient(460px 260px at 0% 100%, rgba(216, 197, 140, 0.16), transparent 60%),
      linear-gradient(135deg, rgba(255,255,255,0.085), rgba(255,255,255,0.04));
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 32px 70px rgba(0, 0, 0, 0.26);
  }

  .luxHeroPanel::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(120deg, rgba(255,255,255,0.08), transparent 28%),
      linear-gradient(180deg, transparent, rgba(255,255,255,0.02));
  }

  .luxHeroContent {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
    gap: 28px;
    align-items: center;
  }

  .luxHeroCopy {
    max-width: 690px;
  }

  .luxHeroAside {
    position: relative;
  }

  .luxHeroStage {
    position: relative;
    overflow: hidden;
    padding: 18px;
    border-radius: 30px;
    min-height: 470px;
    background:
      radial-gradient(260px 180px at 85% 12%, rgba(62,231,195,0.15), transparent 70%),
      radial-gradient(220px 180px at 18% 82%, rgba(216,197,140,0.18), transparent 70%),
      linear-gradient(160deg, rgba(13,20,34,0.92), rgba(20,31,48,0.9));
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .luxHeroStage::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(120deg, rgba(255,255,255,0.08), transparent 22%),
      linear-gradient(transparent 92%, rgba(255,255,255,0.05) 92%);
    opacity: 0.7;
  }

  .luxHeroStageTop {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 18px;
  }

  .luxHeroDeal {
    max-width: 220px;
    padding: 14px 16px;
    border-radius: 20px;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.1);
  }

  .luxHeroDeal strong {
    display: block;
    color: #fff7ef;
    font-family: 'M PLUS Rounded 1c', sans-serif;
    font-size: 1.2rem;
    line-height: 1.3;
    font-weight: 800;
  }

  .luxHeroDeal span {
    display: block;
    margin-top: 5px;
    color: rgba(238,240,247,0.72);
    font-size: 12px;
    line-height: 1.6;
    font-weight: 700;
  }

  .luxHeroTag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
    color: #f7f8ff;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .luxHeroPhoneArena {
    position: relative;
    z-index: 1;
    height: 300px;
  }

  .luxHeroPhone {
    position: absolute;
    bottom: 22px;
    border-radius: 36px;
    box-shadow: 0 28px 50px rgba(0,0,0,0.32);
  }

  .luxHeroPhone::before {
    content: '';
    position: absolute;
    top: 12px;
    left: 50%;
    width: 74px;
    height: 18px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(9, 13, 19, 0.92);
    z-index: 2;
  }

  .luxHeroPhoneBack {
    left: 14px;
    width: 196px;
    height: 264px;
    transform: rotate(-10deg);
    background: linear-gradient(150deg, #f7f4ef, #cab697 62%, #8c6a3b 100%);
    border: 1px solid rgba(255,255,255,0.4);
  }

  .luxHeroPhoneBackInner {
    position: absolute;
    inset: 10px;
    border-radius: 28px;
    background:
      radial-gradient(circle at 30% 25%, rgba(255,255,255,0.3), transparent 32%),
      linear-gradient(160deg, #d7c5a7, #9a7748);
  }

  .luxHeroCameraCluster {
    position: absolute;
    top: 26px;
    left: 22px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 82px;
  }

  .luxHeroCameraCluster span {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background:
      radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), transparent 30%),
      linear-gradient(180deg, #243042, #0d131b);
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: inset 0 0 0 3px rgba(255,255,255,0.04);
  }

  .luxHeroPhoneFront {
    right: 18px;
    width: 216px;
    height: 300px;
    transform: rotate(8deg);
    padding: 10px;
    background: linear-gradient(145deg, #f6f7fb, #d8e1f0 55%, #a1b3cf 100%);
    border: 1px solid rgba(255,255,255,0.45);
  }

  .luxHeroPhoneFrontInner {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 28px;
    overflow: hidden;
    background:
      radial-gradient(circle at 28% 22%, rgba(143,186,255,0.8), transparent 26%),
      radial-gradient(circle at 72% 18%, rgba(246,226,177,0.72), transparent 28%),
      linear-gradient(180deg, #0d1623, #19283b 44%, #223550);
  }

  .luxHeroScreenRing {
    position: absolute;
    inset: 18% 16%;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.18);
    background:
      radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 54%),
      linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
  }

  .luxHeroFloat {
    position: absolute;
    z-index: 2;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 18px 30px rgba(0,0,0,0.16);
  }

  .luxHeroFloat strong {
    display: block;
    color: #ffffff;
    font-size: 14px;
    font-weight: 800;
  }

  .luxHeroFloat span {
    display: block;
    margin-top: 3px;
    color: rgba(238,240,247,0.72);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
  }

  .luxHeroFloatLeft {
    left: 0;
    bottom: 54px;
  }

  .luxHeroFloatRight {
    right: 0;
    top: 84px;
  }

  .luxLabel {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--lh-ink);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    box-shadow: 0 10px 30px rgba(16, 23, 34, 0.06);
  }

  .luxDot {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--lh-accent), var(--lh-accent-soft));
    box-shadow: 0 0 0 6px rgba(62, 231, 195, 0.12);
  }

  .luxTitle {
    margin: 18px 0 14px;
    max-width: 11ch;
    font-family: 'M PLUS Rounded 1c', sans-serif;
    font-size: clamp(2.7rem, 5.3vw, 5rem);
    line-height: 0.98;
    letter-spacing: -0.04em;
    font-weight: 900;
  }

  .luxTitleAccent {
    display: block;
    color: var(--lh-accent) !important;
  }

  .luxSubtitle {
    max-width: 620px;
    margin: 0 0 20px;
    color: var(--lh-sub);
    font-size: 16px;
    line-height: 1.8;
    font-weight: 700;
  }

  .luxActionRow {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .luxBtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 52px;
    padding: 12px 18px;
    border-radius: 16px;
    border: 1px solid transparent;
    text-decoration: none !important;
    font-size: 15px;
    font-weight: 800;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }

  .luxBtn:hover {
    transform: translateY(-2px);
  }

  .luxBtnPrimary {
    background: linear-gradient(135deg, #1a2435, #263246);
    color: #fff7ef !important;
    box-shadow: 0 16px 34px rgba(26, 36, 53, 0.24);
  }

  .luxBtnSecondary {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: var(--lh-ink) !important;
  }

  .luxMiniStats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 0;
  }

  .luxMiniCard {
    min-height: auto;
    padding: 14px 14px 13px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04));
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.14);
  }

  .luxMiniIcon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(184, 138, 68, 0.16), rgba(126, 161, 215, 0.16));
    color: var(--lh-ink);
    margin-bottom: 12px;
    font-size: 14px;
  }

  .luxMiniEyebrow {
    color: var(--lh-sub);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .luxMiniValue {
    margin-top: 5px;
    font-family: 'M PLUS Rounded 1c', sans-serif;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.5;
  }

  .luxHeroQuickRow {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .luxHeroQuick {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #f1f5ff;
    font-size: 13px;
    font-weight: 800;
    line-height: 1;
  }

  .luxHeroQuick i {
    color: var(--lh-accent);
  }

  .luxSection {
    position: relative;
    z-index: 1;
    margin-top: 20px;
  }

  .luxSectionHead {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 14px;
    margin: 18px 2px 16px;
  }

  .luxSectionHead h5 {
    margin: 6px 0 0;
    font-family: 'M PLUS Rounded 1c', sans-serif;
    font-size: 1.42rem;
    font-weight: 800;
    line-height: 1.2;
  }

  .luxSectionCount {
    white-space: nowrap;
    color: var(--lh-ink);
    font-size: 13px;
    font-weight: 800;
    padding: 9px 13px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
  }

  .luxQuickGrid,
  .luxBrandGrid,
  .luxPriceGrid,
  .luxStoryGrid {
    display: grid;
    gap: 14px;
  }

  .luxQuickGrid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .luxBrandGrid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .luxPriceGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .luxStoryGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .luxCard {
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    padding: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.045));
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
    text-decoration: none !important;
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  }

  .luxCard:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 42px rgba(0, 0, 0, 0.24);
    border-color: rgba(62, 231, 195, 0.22);
  }

  .luxQuickIcon,
  .luxPriceIcon,
  .luxBrandIcon {
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    margin-bottom: 14px;
    background: linear-gradient(135deg, rgba(184,138,68,0.18), rgba(126,161,215,0.18));
    color: var(--lh-ink);
    font-size: 20px;
  }

  .luxQuickTitle,
  .luxPriceTitle,
  .luxBrandTitle,
  .luxStoryTitle {
    font-family: 'M PLUS Rounded 1c', sans-serif;
    font-size: 17px;
    line-height: 1.35;
    font-weight: 800;
  }

  .luxQuickText,
  .luxPriceText,
  .luxBrandText,
  .luxStoryText {
    margin-top: 6px;
    color: var(--lh-sub);
    font-size: 13px;
    line-height: 1.65;
    font-weight: 700;
  }

  .luxBrandCard {
    text-align: center;
    padding-top: 20px;
  }

  .luxBrandIcon {
    margin: 0 auto 14px;
    border-radius: 999px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
    border: 1px solid rgba(255,255,255,0.1);
  }

  .luxBrandIcon img {
    width: 34px;
    height: 34px;
    object-fit: contain;
  }

  .luxToneStrip {
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
    padding: 14px 18px;
    margin-top: 18px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(16,23,34,0.96), rgba(39,53,74,0.96));
    color: #f7efe7;
    box-shadow: 0 18px 38px rgba(16, 23, 34, 0.16);
  }

  .luxTicker {
    display: flex;
    gap: 28px;
    width: max-content;
    animation: luxTicker 22s linear infinite;
  }

  @keyframes luxTicker {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  .luxTickerItem {
    white-space: nowrap;
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 800;
    color: rgba(247,239,231,0.78);
  }

  .luxTickerItem strong {
    color: #f1cf95;
  }

  .luxResultBar {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 22px;
    margin-bottom: 20px;
    border-radius: 26px;
    background: linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.05));
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
  }

  .luxBack {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 11px 16px;
    border-radius: 15px;
    background: var(--lh-dark);
    color: #fff7ef !important;
    text-decoration: none !important;
    font-weight: 800;
  }

  .luxResultTitle {
    margin: 0;
    font-family: 'M PLUS Rounded 1c', sans-serif;
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.2;
    font-weight: 800;
  }

  .luxResultText {
    margin: 4px 0 0;
    color: var(--lh-sub);
    font-size: 14px;
    line-height: 1.7;
    font-weight: 700;
  }

  .luxResultChip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 13px;
    border-radius: 999px;
    border: 1px solid rgba(16, 23, 34, 0.08);
    background: rgba(255,255,255,0.06);
    color: var(--lh-ink);
    font-size: 13px;
    font-weight: 800;
  }

  .luxProductWrap {
    position: relative;
    z-index: 1;
    padding: 14px 10px 10px;
    border-radius: 30px;
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.035));
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.2);
  }

  .luxCarousel {
    margin-top: 0;
    padding: 10px;
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
    background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
    box-shadow: 0 22px 40px rgba(0,0,0,0.14);
  }

  .luxCarouselSection {
    margin-top: 22px;
  }

  .luxEmpty {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: 54px 20px;
    border-radius: 28px;
    background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.045));
    border: 1px dashed rgba(255,255,255,0.16);
  }

  .luxEmpty i {
    display: inline-grid;
    place-items: center;
    width: 78px;
    height: 78px;
    margin-bottom: 14px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(184,138,68,0.18), rgba(126,161,215,0.18));
    color: var(--lh-ink);
    font-size: 28px;
  }

  .luxEmpty p {
    margin: 0 0 18px;
    color: var(--lh-sub);
    font-size: 16px;
    line-height: 1.7;
    font-weight: 700;
  }

  .luxPager {
    display: flex;
    justify-content: center;
    margin-top: 32px;
  }

  .luxProductWrap .row {
    margin-left: -10px;
    margin-right: -10px;
  }

  .luxProductWrap .row > [class*='col-'] {
    padding-left: 10px;
    padding-right: 10px;
  }

  .luxHome .product,
  .luxHome .card {
    overflow: hidden;
    border-radius: 22px !important;
    background: linear-gradient(180deg, #121a2b 0%, #0f1524 100%) !important;
    border: 1px solid rgba(255,255,255,0.09) !important;
    box-shadow: 0 18px 34px rgba(0,0,0,0.22) !important;
  }

  .luxHome .card-body,
  .luxHome .product .card-body {
    background: transparent !important;
  }

  .luxHome .card-title,
  .luxHome .card-title a,
  .luxHome .product-title,
  .luxHome h3 a,
  .luxHome h4 a {
    color: #f3f6ff !important;
    font-family: 'M PLUS Rounded 1c', sans-serif !important;
    font-size: 1rem !important;
    line-height: 1.45 !important;
    font-weight: 800 !important;
    letter-spacing: 0.01em;
  }

  .luxHome .card-text,
  .luxHome .price,
  .luxHome .product-price,
  .luxHome strong.text-price,
  .luxHome .text-price,
  .luxHome .price strong {
    color: #ffd98f !important;
    font-size: 1.22rem !important;
    font-weight: 900 !important;
    letter-spacing: 0.01em;
  }

  .luxHome .rating,
  .luxHome .rating span,
  .luxHome .rating svg,
  .luxHome .product .rating {
    color: #2cf1cb !important;
    fill: #2cf1cb !important;
    font-weight: 800 !important;
  }

  .luxHome .btn-primary,
  .luxHome .product .btn,
  .luxHome .card .btn {
    border: none !important;
    border-radius: 14px !important;
    background: linear-gradient(135deg, #37e9c6, #1bcfb0) !important;
    color: #071018 !important;
    font-weight: 900 !important;
    box-shadow: 0 14px 26px rgba(27, 207, 176, 0.2) !important;
  }

  .luxHome .btn-primary:hover,
  .luxHome .product .btn:hover,
  .luxHome .card .btn:hover {
    filter: brightness(1.03);
    transform: translateY(-1px);
  }

  @media (max-width: 1199px) {
    .luxQuickGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .luxBrandGrid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 991px) {
    .luxShell {
      padding: 18px;
      border-radius: 26px;
    }

    .luxHeroPanel {
      padding: 24px 20px 18px;
    }

    .luxHeroContent,
    .luxMiniStats,
    .luxPriceGrid,
    .luxStoryGrid {
      grid-template-columns: 1fr;
    }

    .luxHeroStage {
      min-height: 420px;
    }

    .luxHeroFloatRight {
      top: 66px;
    }

    .luxTitle {
      max-width: 100%;
    }


  @media (max-width: 767px) {
    .luxQuickGrid,
    .luxBrandGrid {
      grid-template-columns: 1fr 1fr;
    }

    .luxSectionHead,
    .luxResultBar {
      align-items: flex-start;
      flex-direction: column;
    }

    .luxMiniCard,
    .luxCard {
      border-radius: 22px;
    }

    .luxHeroPhoneArena {
      height: 280px;
    }

    .luxHeroPhoneBack {
      width: 168px;
      height: 228px;
      left: 0;
    }

    .luxHeroPhoneFront {
      width: 188px;
      height: 262px;
      right: 0;
    }
  }

  @media (max-width: 575px) {
    .luxHome {
      padding-top: 8px;
    }

    .luxShell {
      padding: 14px;
      border-radius: 22px;
    }

    .luxQuickGrid,
    .luxBrandGrid {
      grid-template-columns: 1fr;
    }

    .luxTitle {
      font-size: clamp(2rem, 10vw, 2.7rem);
    }

    .luxActionRow {
      flex-direction: column;
    }

    .luxHeroPanel {
      padding: 22px 16px 16px;
      border-radius: 22px;
    }

    .luxHeroStage {
      min-height: 396px;
      padding: 14px;
    }

    .luxBtn {
      width: 100%;
    }

    .luxHeroQuickRow {
      gap: 8px;
    }

    .luxHeroQuick {
      width: 100%;
      justify-content: center;
    }

    .luxHeroFloat {
      padding: 10px 12px;
    }

    .luxHeroFloatLeft {
      left: 6px;
      bottom: 42px;
    }

    .luxHeroFloatRight {
      right: 6px;
      top: 54px;
    }
  }
`

if (typeof document !== 'undefined') {
  const existing = document.getElementById('lux-home-style')
  if (!existing) {
    const styleTag = document.createElement('style')
    styleTag.id = 'lux-home-style'
    styleTag.textContent = STYLE
    document.head.appendChild(styleTag)
  } else {
    existing.textContent = STYLE
  }
}

const BRANDS = [
  { name: 'Apple', to: '/brand/Apple', img: '/images/apple.jpg', hint: 'Thiết kế sang, hệ sinh thái mạnh' },
  { name: 'Samsung', to: '/brand/Samsung', img: '/images/samsung.jpg', hint: 'Màn hình đẹp, nhiều lựa chọn' },
  { name: 'Xiaomi', to: '/brand/Xiaomi', img: '/images/xiaomi.png', hint: 'Hiệu năng tốt, giá dễ tiếp cận' },
  { name: 'OPPO', to: '/brand/OPPO', img: '/images/oppo.jpg', hint: 'Camera ổn định, hoàn thiện đẹp' },
  { name: 'Realme', to: '/brand/Realme', img: '/images/realme.jpg', hint: 'Trẻ trung, pin bền, sạc nhanh' },
]

const PRICE_RANGES = [
  { label: 'Dưới 10 triệu', to: '/price/duoi-10tr', sub: 'Gọn ngân sách, vẫn đủ đẹp và mượt', icon: 'fas fa-wallet' },
  { label: '10 đến 20 triệu', to: '/price/10-20tr', sub: 'Cân bằng giữa hiệu năng và trải nghiệm', icon: 'fas fa-layer-group' },
  { label: 'Trên 20 triệu', to: '/price/tren-20tr', sub: 'Flagship cao cấp, hoàn thiện vượt trội', icon: 'fas fa-gem' },
]

const QUICK_PICK = [
  { label: 'iPhone', to: '/search/iphone', text: 'Ưu tiên giao diện mượt, giá trị dùng lâu dài.', icon: 'fab fa-apple' },
  { label: 'Samsung', to: '/brand/Samsung', text: 'Nổi bật với màn hình đẹp và nhiều model.', icon: 'fab fa-android' },
  { label: 'Gaming', to: '/search/gaming', text: 'Tối ưu hiệu năng, tản nhiệt và pin.', icon: 'fas fa-gamepad' },
  { label: 'Camera đẹp', to: '/search/camera', text: 'Dành cho nhu cầu chụp ảnh mỗi ngày.', icon: 'fas fa-camera-retro' },
]

const STORIES = [
  { title: 'Chọn máy theo lối sống', text: 'Bạn có thể đi từ nhu cầu thực tế như chụp ảnh, làm việc hay pin lâu thay vì đọc quá nhiều thông số.', icon: 'fas fa-star' },
  { title: 'Gợi ý phân khúc rõ ràng', text: 'Mỗi khung giá được chia mạch lạc để tìm sản phẩm nhanh hơn, tránh cảm giác rối khi mua.', icon: 'fas fa-sliders-h' },
  { title: 'Tập trung vào trải nghiệm', text: 'Bố cục ưu tiên sản phẩm, độ tương phản rõ và chữ lớn để xem lâu vẫn thoải mái.', icon: 'fas fa-eye' },
]

const TICKER = ['Hàng chính hãng', 'Bảo hành minh bạch', 'Giao nhanh nội thành', 'Thu cũ đổi mới', 'Trả góp linh hoạt']

const STATS = [
  { icon: 'fas fa-shield-alt', title: 'Bảo hành', value: 'Chính hãng 12 đến 24 tháng' },
  { icon: 'fas fa-truck', title: 'Giao nhận', value: 'Hỗ trợ giao nhanh trong ngày' },
  { icon: 'fas fa-credit-card', title: 'Thanh toán', value: 'Nhiều hình thức, trả góp 0%' },
]

const HERO_QUICKS = [
  { icon: 'fas fa-bolt', label: 'Flash sale mỗi ngày' },
  { icon: 'fas fa-sync-alt', label: 'Thu cũ đổi mới' },
  { icon: 'fas fa-percentage', label: 'Trả góp 0%' },
]

const SectionHead = ({ title, right }) => (
  <div className='luxSectionHead'>
    <div>
      <div className='luxLabel'>
        <span className='luxDot' />
        <span>Tuyển chọn nổi bật</span>
      </div>
      <h5>{title}</h5>
    </div>
    {right}
  </div>
)

const HomeScreen = ({ match, location }) => {
  const keyword = location.search ? location.search.split('=')[1] : ''
  const decodedKeyword = keyword ? decodeURIComponent(keyword) : ''
  const pageNumber = match.params.pageNumber || 1

  const sort = 'latest'
  let brand = ''
  let minPrice = ''
  let maxPrice = ''
  let rangeLabel = ''

  if (match.path.includes('/brand/:brand')) brand = match.params.brand

  if (match.path.includes('/price/:range')) {
    if (match.params.range === 'duoi-10tr') {
      minPrice = 0
      maxPrice = 10000000
      rangeLabel = 'Dưới 10 triệu'
    }
    if (match.params.range === '10-20tr') {
      minPrice = 10000000
      maxPrice = 20000000
      rangeLabel = '10 đến 20 triệu'
    }
    if (match.params.range === 'tren-20tr') {
      minPrice = 20000000
      rangeLabel = 'Trên 20 triệu'
    }
  }

  const isLanding = !decodedKeyword && !brand && !rangeLabel

  const dispatch = useDispatch()
  const productList = useSelector((state) => state.productList)
  const { loading, error, products = [], page, pages } = productList

  useEffect(() => {
    dispatch(listProducts({ keyword, brand, minPrice, maxPrice, sort }, pageNumber))
  }, [dispatch, keyword, brand, minPrice, maxPrice, sort, pageNumber])

  const resultTitle = decodedKeyword
    ? `Kết quả cho "${decodedKeyword}"`
    : brand
    ? `${brand} chính hãng`
    : rangeLabel
    ? `Điện thoại ${rangeLabel.toLowerCase()}`
    : 'Danh sách điện thoại'

  return (
    <div className='luxHome'>
      <Meta />

      <div className='luxShell'>
        {isLanding ? (
          <>
            <section className='luxHero'>
              <div className='luxHeroPanel'>
                <div className='luxHeroContent'>
                  <div className='luxHeroCopy'>
                    <div className='luxLabel'>
                      <span className='luxDot' />
                      <span>Flagship chính hãng 2026</span>
                    </div>

                    <h1 className='luxTitle'>
                      Săn điện thoại hot
                      <span className='luxTitleAccent'>giá tốt, giao nhanh</span>
                    </h1>

                    <p className='luxSubtitle'>
                      Tập trung vào những mẫu bán chạy, ưu đãi rõ ràng và điều hướng nhanh theo thương hiệu để người xem
                      quyết định mua dễ hơn ngay từ đầu trang.
                    </p>

                    <div className='luxActionRow'>
                      <Link to='/home' className='luxBtn luxBtnPrimary'>
                        <i className='fas fa-fire' /> Mua ngay hôm nay
                      </Link>
                      <Link to='/?keyword=iphone' className='luxBtn luxBtnSecondary'>
                        <i className='fab fa-apple' /> iPhone bán chạy
                      </Link>
                      <Link to='/brand/samsung' className='luxBtn luxBtnSecondary'>
                        <i className='fab fa-android' /> Samsung nổi bật
                      </Link>
                    </div>

                    <div className='luxHeroQuickRow'>
                      {HERO_QUICKS.map((item) => (
                        <div key={item.label} className='luxHeroQuick'>
                          <i className={item.icon} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='luxHeroAside'>
                    <div className='luxHeroStage'>
                      <div className='luxHeroStageTop'>
                        <div className='luxHeroDeal'>
                          <strong>Deal flagship mỗi ngày</strong>
                          <span>Giảm giá rõ ràng, máy chính hãng và nhiều mẫu đang có sẵn để chốt nhanh.</span>
                        </div>
                        <div className='luxHeroTag'>
                          <i className='fas fa-star' />
                          <span>Best seller</span>
                        </div>
                      </div>

                      <div className='luxHeroPhoneArena'>
                        <div className='luxHeroPhone luxHeroPhoneBack'>
                          <div className='luxHeroPhoneBackInner'>
                            <div className='luxHeroCameraCluster'>
                              <span />
                              <span />
                              <span />
                            </div>
                          </div>
                        </div>

                        <div className='luxHeroPhone luxHeroPhoneFront'>
                          <div className='luxHeroPhoneFrontInner'>
                            <div className='luxHeroScreenRing' />
                          </div>
                        </div>

                        <div className='luxHeroFloat luxHeroFloatLeft'>
                          <strong>Camera nổi bật</strong>
                          <span>Chụp đêm rõ, quay video ổn định.</span>
                        </div>

                        <div className='luxHeroFloat luxHeroFloatRight'>
                          <strong>Sạc nhanh, pin khỏe</strong>
                          <span>Dùng cả ngày, sạc lại rất nhanh.</span>
                        </div>
                      </div>

                      <div className='luxMiniStats'>
                        {STATS.map((item) => (
                          <div key={item.title} className='luxMiniCard'>
                            <div className='luxMiniIcon'>
                              <i className={item.icon} />
                            </div>
                            <div className='luxMiniEyebrow'>{item.title}</div>
                            <div className='luxMiniValue'>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </section>

            <section className='luxSection luxCarouselSection'>
              <SectionHead
                title='Nổi bật trong tuần'
                right={<div className='luxSectionCount'>Slider sản phẩm</div>}
              />
              <div className='luxCarousel'>
                <ProductCarousel />
              </div>
            </section>

            <div className='luxToneStrip'>
              <div className='luxTicker'>
                {[...TICKER, ...TICKER].map((item, index) => (
                  <div key={`${item}-${index}`} className='luxTickerItem'>
                    <strong>•</strong> {item}
                  </div>
                ))}
              </div>
            </div>

            <section className='luxSection'>
              <SectionHead title='Thương hiệu nổi bật' />
              <div className='luxBrandGrid'>
                {BRANDS.map((brandItem) => (
                  <Link key={brandItem.name} to={brandItem.to} className='luxCard luxBrandCard'>
                    <div className='luxBrandIcon'>
                      <img
                        src={brandItem.img}
                        alt={brandItem.name}
                        onError={(event) => {
                          event.target.style.display = 'none'
                          event.target.parentNode.innerHTML = `<i class="fab fa-${
                            brandItem.name.toLowerCase() === 'apple' ? 'apple' : 'android'
                          }"></i>`
                        }}
                      />
                    </div>
                    <div className='luxBrandTitle'>{brandItem.name}</div>
                    <div className='luxBrandText'>{brandItem.hint}</div>
                  </Link>
                ))}
              </div>
            </section>

            <section className='luxSection'>
              <SectionHead title='Chọn theo ngân sách' />
              <div className='luxPriceGrid'>
                {PRICE_RANGES.map((item) => (
                  <Link key={item.to} to={item.to} className='luxCard'>
                    <div className='luxPriceIcon'>
                      <i className={item.icon} />
                    </div>
                    <div className='luxPriceTitle'>{item.label}</div>
                    <div className='luxPriceText'>{item.sub}</div>
                  </Link>
                ))}
              </div>
            </section>

          </>
        ) : (
          <div className='luxResultBar'>
            <div>
              <Link to='/' className='luxBack'>
                <i className='fas fa-arrow-left' /> Về trang chính
              </Link>
            </div>

            <div style={{ flex: 1 }}>
              <h2 className='luxResultTitle'>{resultTitle}</h2>
            </div>

            <div className='luxResultChip'>
              <i className='fas fa-filter' /> Bộ lọc đang áp dụng
            </div>
          </div>
        )}

        <section className='luxSection'>
          <SectionHead
            title={isLanding ? 'Sản phẩm mới nhất' : 'Danh sách sản phẩm'}
            right={products.length > 0 ? <div className='luxSectionCount'>{products.length} sản phẩm</div> : null}
          />

          {loading ? (
            <Loader />
          ) : error ? (
            <Message variant='danger'>{error}</Message>
          ) : products.length === 0 ? (
            <div className='luxEmpty'>
              <i className='fas fa-search' />
              <p>Hiện chưa có sản phẩm phù hợp với lựa chọn này. Bạn có thể quay lại trang chính để xem toàn bộ mẫu máy.</p>
              <Link to='/' className='luxBtn luxBtnPrimary'>
                Xem tất cả sản phẩm
              </Link>
            </div>
          ) : (
            <div className='luxProductWrap'>
              <Row className='g-3'>
                {products.map((product) => (
                  <Col key={product._id} xs={12} sm={6} md={4} lg={4} xl={3}>
                    <Product product={product} />
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {!loading && !error && products.length > 0 ? (
            <div className='luxPager'>
              <Paginate pages={pages} page={page} keyword={keyword} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default HomeScreen
