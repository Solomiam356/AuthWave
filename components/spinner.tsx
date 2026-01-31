export const Spinner = () => (
  <svg
  className="animate-spin h-6 w-6 text-gray-400"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
>
  <circle
    className="opacity-25"
    cx="12"
    cy="12"
    r="10"
    stroke="currentColor"
    strokeWidth="4"
  />
  <path
    className="opacity-75"
    fill="currentColor"
    d="M12 2a10 10 0 00-10 10h4a6 6 0 016-6V2z"
  />
</svg>
);