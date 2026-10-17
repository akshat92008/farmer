package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = ForestGreenPrimary,
    onPrimary = Color.White,
    primaryContainer = MintSurfaceTint,
    onPrimaryContainer = ForestGreenPrimary,
    secondary = TerracottaAccent,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFE5D9),
    onSecondaryContainer = Color(0xFF5C1D0E),
    tertiary = WarmAmber,
    onTertiary = DeepSoilText,
    tertiaryContainer = CautionAmberBg,
    onTertiaryContainer = CautionAmberText,
    background = CreamBackground,
    onBackground = DeepSoilText,
    surface = WarmSurfaceCard,
    onSurface = DeepSoilText,
    surfaceVariant = SoftEarthSurface,
    onSurfaceVariant = MutedBarkText,
    error = Color(0xFFB71C1C),
    onError = Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = LightMintPrimary,
    onPrimary = DarkForestBg,
    primaryContainer = EmeraldSecondary,
    onPrimaryContainer = Color.White,
    secondary = SoftGoldSecondary,
    onSecondary = DarkForestBg,
    secondaryContainer = Color(0xFF4A2511),
    onSecondaryContainer = Color(0xFFFFDBC8),
    tertiary = HarvestGold,
    onTertiary = DarkForestBg,
    background = DarkForestBg,
    onBackground = Color(0xFFE9F5EE),
    surface = DarkForestSurface,
    onSurface = Color(0xFFE9F5EE),
    surfaceVariant = DarkCardSurface,
    onSurfaceVariant = Color(0xFFB7D1C3)
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
