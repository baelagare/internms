<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendMessageRequest;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    /**
     * Verify if the sender is authorized to message the recipient.
     */
    protected function canMessage(User $sender, User $recipient): bool
    {
        if ($sender->id === $recipient->id) {
            return false;
        }

        // Admin can message any account
        if ($sender->isAdmin() || $recipient->isAdmin()) {
            return true;
        }

        if ($sender->isStudent()) {
            // Student can message their coordinator or their assigned supervisor
            if ($recipient->isCoordinator() && $recipient->college_code === $sender->college_code) {
                return true;
            }
            if ($recipient->isSupervisor() && $sender->company_id && $recipient->company_id === $sender->company_id) {
                return true;
            }
            return false;
        }

        if ($sender->isCoordinator()) {
            // Coordinator can message students in their college and supervisors
            if ($recipient->isStudent() && $recipient->college_code === $sender->college_code) {
                return true;
            }
            if ($recipient->isSupervisor()) {
                return true;
            }
            return false;
        }

        if ($sender->isSupervisor()) {
            // Supervisor can message their company interns and coordinators
            if ($recipient->isStudent() && ($recipient->company_id === $sender->company_id || $recipient->company === $sender->company)) {
                return true;
            }
            if ($recipient->isCoordinator()) {
                return true;
            }
            return false;
        }

        return false;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $messages = Message::where('sender_id', $user->id)
            ->orWhere('recipient_id', $user->id)
            ->with(['sender:id,name,role', 'recipient:id,name,role'])
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'messages' => $messages,
        ]);
    }

    public function store(SendMessageRequest $request): JsonResponse
    {
        $sender = $request->user();
        $recipient = User::findOrFail($request->validated('recipient_id'));

        if (! $this->canMessage($sender, $recipient)) {
            abort(403, 'Communication boundary restriction: You are not authorized to message this contact.');
        }

        $message = Message::create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => $request->validated('body'),
        ]);

        return response()->json([
            'message' => 'Message sent.',
            'entry' => $message->load(['sender:id,name,role', 'recipient:id,name,role']),
        ], 201);
    }
}
