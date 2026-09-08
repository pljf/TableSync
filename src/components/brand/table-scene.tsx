import { useId } from "react";

export function TableScene() {
  const patternId = useId();
  return (
    <svg aria-hidden="true" className="table-scene" viewBox="0 0 560 540" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={patternId} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" stroke="#D8CBB5" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect x="28" y="36" width="500" height="470" rx="230" fill="#E7DBC6" />
      <rect x="28" y="36" width="500" height="470" rx="230" fill={`url(#${patternId})`} opacity=".65" />

      <g transform="rotate(-13 153 334)">
        <path d="M89 196L221 198L223 449L90 446Z" fill="#A3AB86" />
        <path d="M102 206L208 207M102 215L208 216M103 426L209 428M103 435L209 437" stroke="#717E55" strokeWidth="2" />
        <path d="M142 199V446M151 200V446M160 200V446" stroke="#C1C7AC" strokeWidth="1" />
      </g>

      <ellipse cx="305" cy="293" rx="145" ry="142" fill="#9C8C72" opacity=".13" />
      <circle cx="298" cy="282" r="142" fill="#FBF6EA" />
      <circle cx="298" cy="282" r="131" stroke="#C3B99B" strokeWidth="2" />
      <circle cx="298" cy="282" r="116" stroke="#D5CCB5" strokeWidth="1" />
      <circle cx="298" cy="282" r="98" fill="#F0E2C1" />
      <path d="M232 246C221 215 270 195 299 220C320 196 354 222 347 252C385 254 381 287 356 299C362 332 322 353 298 330C273 356 242 332 246 312C210 306 210 266 232 246Z" fill="#D6A754" />
      <g stroke="#F4CB72" strokeWidth="6" strokeLinecap="round">
        <path d="M239 251C281 223 285 281 325 239C346 218 359 251 336 267C306 291 265 241 249 275C236 302 277 309 304 286" />
        <path d="M262 227C239 247 279 270 313 245C344 221 364 276 322 288C285 299 273 269 246 292C230 312 279 333 309 309" />
        <path d="M323 223C299 231 316 275 278 282C250 290 264 320 287 318C310 316 353 317 348 283" />
        <path d="M230 275C238 260 261 269 270 285M304 321C335 332 368 311 352 290" />
      </g>
      <g>
        <circle cx="252" cy="235" r="14" fill="#B75234" />
        <path d="M245 229C247 226 252 225 256 228" stroke="#D98355" strokeWidth="3" strokeLinecap="round" />
        <circle cx="335" cy="301" r="15" fill="#BB5233" />
        <path d="M329 293C334 290 339 292 342 295" stroke="#DF9362" strokeWidth="3" strokeLinecap="round" />
        <circle cx="254" cy="304" r="11" fill="#C15D3B" />
        <circle cx="338" cy="251" r="10" fill="#B44F32" />
      </g>
      <g fill="#607346" stroke="#4D6236" strokeWidth="1.3">
        <path d="M284 251C260 252 260 229 274 222C289 226 294 240 284 251Z" />
        <path d="M285 252C278 231 298 222 310 229C313 245 298 253 285 252Z" />
        <path d="M302 291C280 283 285 267 298 264C311 270 314 283 302 291Z" />
        <path d="M302 291C310 271 328 277 329 288C320 301 310 301 302 291Z" />
      </g>
      <g stroke="#6A7848" strokeWidth="2.5" strokeLinecap="round">
        <path d="M278 237L285 253M302 289L298 279M244 267L239 261M318 320L321 314M309 218L311 213" />
      </g>

      <g transform="rotate(14 422 107)">
        <ellipse cx="422" cy="109" rx="39" ry="46" fill="#A7987C" opacity=".15" />
        <ellipse cx="416" cy="102" rx="38" ry="44" fill="#F9F3E4" stroke="#BAAF93" strokeWidth="2" />
        <ellipse cx="416" cy="102" rx="28" ry="34" fill="#D8B573" />
        <path d="M395 103C406 93 426 100 437 91M395 112C408 103 423 111 436 102" stroke="#EBD09C" strokeWidth="3" />
        <path d="M409 79C418 72 430 82 428 88C418 91 412 87 409 79Z" fill="#FCF4CC" />
      </g>

      <g transform="rotate(-20 148 123)">
        <ellipse cx="147" cy="133" rx="54" ry="53" fill="#9C8C72" opacity=".12" />
        <circle cx="141" cy="126" r="53" fill="#B86B45" />
        <circle cx="141" cy="126" r="44" stroke="#E2A775" strokeWidth="2" />
        <circle cx="141" cy="126" r="37" fill="#748356" />
        <path d="M115 131C97 106 126 92 134 115C131 91 163 88 159 117C182 107 187 134 163 143C155 164 131 160 131 140C117 156 105 147 115 131Z" fill="#99A571" />
        <path d="M121 112C129 117 134 126 140 139M157 108C149 116 145 127 140 139M167 130C157 129 148 134 140 139" stroke="#536944" strokeWidth="2" strokeLinecap="round" />
        <circle cx="130" cy="125" r="8" fill="#C3623D" />
        <circle cx="155" cy="138" r="7" fill="#A84C32" />
      </g>

      <g transform="rotate(10 466 330)" stroke="#A19273" strokeLinecap="round">
        <path d="M462 270V394" strokeWidth="5" />
        <path d="M449 226V261C449 278 474 278 474 261V226M457 226V253M466 226V253" strokeWidth="3" />
        <path d="M490 397V272L497 233C509 251 511 279 499 292H491" strokeWidth="4" fill="#C9BDA0" />
      </g>

      <g transform="rotate(23 180 434)">
        <path d="M122 437C125 402 154 398 195 408C225 415 231 449 199 464C170 478 123 467 122 437Z" fill="#D3A168" />
        <path d="M133 436C135 414 158 409 190 417C213 422 219 442 195 453C174 464 132 458 133 436Z" fill="#E4BE86" />
        <path d="M147 421L142 443M166 418L159 450M185 422L178 454" stroke="#BB8954" strokeWidth="5" strokeLinecap="round" />
      </g>

      <g stroke="#657346" strokeWidth="2" strokeLinecap="round">
        <path d="M358 451C377 447 394 428 402 409" />
        <path d="M376 442C364 429 373 419 384 429M386 431C375 418 385 409 395 418M390 426C408 432 414 418 399 416M371 446C388 456 399 443 382 438" fill="#899461" />
      </g>
      <circle cx="87" cy="254" r="4" fill="#B75D3C" />
      <circle cx="377" cy="181" r="3" fill="#B75D3C" />
      <path d="M333 103L337 94M328 94L338 103" stroke="#B75D3C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
