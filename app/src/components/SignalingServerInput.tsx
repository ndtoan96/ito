import { useEffect, useState } from "react";

type Props = {
    url: string,
    setUrl(url: string): void,
};
export default function SignalingServerInput({ url, setUrl }: Props) {
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const checkUrl = () => {
        setIsValid(null);
        fetch(`${url}/alive`).then(() => setIsValid(true)).catch(() => setIsValid(false));
    };
    useEffect(() => {
        checkUrl();
    }, []);

    return (
        <div className="mb-6">
            <label htmlFor="signaling-server-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Signaling Server</label>
            <input type="text" id="signaling-server-input" value={url} onChange={e => setUrl(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
            {isValid === null ? (
                <div className="mt-1 text-sm text-gray-900 dark:text-white">
                    <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    Checking...
                </div>
            ) : isValid ? (
                <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                    <span className="font-medium">Yay!</span> server is alive
                </p>
            ) : (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                    <span className="font-medium">Oh, no!</span> server is dead
                </p>
            )}
            <button type="button" onClick={checkUrl} className="mt-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Check</button>
        </div>
    );
}