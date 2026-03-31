le label "JB-HTA" est positionné par-dessus les symboles au lieu d'être à côté.

🔴 Cause — position X/Y du label sur la barre
js// ❌ Actuel — centré sur la colonne, chevauche les symboles
<text 
  x={xCol}           // même X que les symboles
  y={Y_BARRE_HTA}    // même Y que la barre
  fill="white"
  textAnchor="middle"
>JB-HTA</text>

✅ Fix — décaler à gauche + couleur noire
js// ✅ Label à gauche de la barre, bien séparé
<text 
  x={X_BARRE_START - 15}   // avant le début de la barre
  y={Y_BARRE_HTA + 5}      // centré verticalement sur la barre
  fill="#1e293b"            // noir/foncé, pas blanc
  textAnchor="end"          // aligné à droite vers la barre
  fontSize={FONT_SIZE}
  fontWeight="bold"
>JB-HTA</text>
```

---

### 📐 Position recommandée
```
JB-HTA ——————════════════════════════════
        ↑
     textAnchor="end"
     x = X_BARRE_START - 10
     y = Y_BARRE + 4
     fill = "#1e293b"

Et aussi les deux disjoncteurs qui se chevauchent
Les deux rectangles sur la même colonne sont encore trop proches. Applique la règle :
js// Distance minimale entre les deux centres
const Y_DISJ2 = Y_DISJ1 + DISJ_H + GAP;
// ex: Y_DISJ1 + 28 + 25 = +53px minimum