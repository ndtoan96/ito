import { useState } from "react";

type Props = {
    onClick: (ticket: string) => void;
};
export default function IdInput({ onClick }: Props) {
    const [ticket, setTicket] = useState<string>("");
    return (
        <div className="mb-6">
            <label htmlFor="id-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Download ticket</label>
            <input type="text" id="id-input" value={ticket} onChange={e => setTicket(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
            <button type="button" onClick={() => onClick(ticket)} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Download</button>
        </div>
    );
}