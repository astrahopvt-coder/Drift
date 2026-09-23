#version 330 core
in vec2 v_texCoord; out vec4 fragColor;
uniform sampler2D u_currentTexture;

uniform float u_colorSide;   // 0 = color on left half / matte on right half. 1 = swapped.
uniform float u_invertAlpha; // 0 = white in the matte half reveals, 1 = black reveals
uniform float u_blackPoint;  // alpha ramp low edge (luma at/below this -> fully transparent)
uniform float u_whitePoint;  // alpha ramp high edge (luma at/above this -> fully opaque)

const vec3 kRec709 = vec3(0.2126, 0.7152, 0.0722);

void main()
{
    bool colorOnLeft = u_colorSide < 0.5;

    // The color half is half the frame width, so centering it leaves an equal
    // transparent margin on both sides rather than pinning it to one edge. That
    // margin is padding, not a rescale — the visible content keeps its native
    // pixel size, and the clip's own pivot now sits in the middle of what's
    // actually drawn, which is what makes Transform scale/move behave normally
    // afterwards instead of scaling around empty space.
    const float kHalfWidth = 0.5;
    const float kMargin = (1.0 - kHalfWidth) * 0.5;

    bool inColorBand = v_texCoord.x >= kMargin && v_texCoord.x < kMargin + kHalfWidth;
    if (!inColorBand) {
        fragColor = vec4(0.0);
        return;
    }

    float localX = v_texCoord.x - kMargin; // 0..0.5, position within the color half
    vec2 colorUV = vec2(localX + (colorOnLeft ? 0.0 : 0.5), v_texCoord.y);
    vec2 matteUV = vec2(localX + (colorOnLeft ? 0.5 : 0.0), v_texCoord.y);

    vec3 color = texture(u_currentTexture, colorUV).rgb;
    vec3 matteSample = texture(u_currentTexture, matteUV).rgb;

    float luma = dot(matteSample, kRec709);
    if (u_invertAlpha > 0.5) luma = 1.0 - luma;

    float lo = min(u_blackPoint, u_whitePoint - 0.0001);
    float hi = max(u_whitePoint, lo + 0.0001);
    float alpha = clamp(smoothstep(lo, hi, luma), 0.0, 1.0);

    fragColor = vec4(color, alpha);
}
